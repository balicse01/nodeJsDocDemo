/*-
 *
 *  This file is part of Oracle NoSQL Database
 *  Copyright (C) 2014, 2018 Oracle and/or its affiliates.  All rights reserved.
 *
 * If you have received this file as part of Oracle NoSQL Database the
 * following applies to the work as a whole:
 *
 *   Oracle NoSQL Database server software is free software: you can
 *   redistribute it and/or modify it under the terms of the GNU Affero
 *   General Public License as published by the Free Software Foundation,
 *   version 3.
 *
 *   Oracle NoSQL Database is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *   Affero General Public License for more details.
 *
 * If you have received this file as part of Oracle NoSQL Database Client or
 * distributed separately the following applies:
 *
 *   Oracle NoSQL Database client software is free software: you can
 *   redistribute it and/or modify it under the terms of the Apache License
 *   as published by the Apache Software Foundation, version 2.0.
 *
 * You should have received a copy of the GNU Affero General Public License
 * and/or the Apache License in the LICENSE file along with Oracle NoSQL
 * Database client or server distribution.  If not, see
 * <http://www.gnu.org/licenses/>
 * or
 * <http://www.apache.org/licenses/LICENSE-2.0>.
 *
 * An active Oracle commercial licensing agreement for this product supersedes
 * these licenses and in such case the license notices, but not the copyright
 * notice, may be removed by you in connection with your distribution that is
 * in accordance with the commercial licensing terms.
 *
 * For more information please contact:
 *
 * berkeleydb-info_us@oracle.com
 *
 */
'use strict';

var Int64 = require('node-int64');
var hex2dec = require('./hex2dec');

// not being strict means do not generate syntax errors for 'duplicate key'
var strict = false;

var at; // The index of the current character
var ch; // The current character
var escapee = {
  '"':  '"',  '\\': '\\',  '/':  '/',  b:    '\b',
  f:    '\f',  n:    '\n',  r:    '\r',  t:    '\t'
};
var text='';

// Call error when something is wrong.
function error(message) {
  throw {
    name: 'SyntaxError',
    message: message,
    at: at,
    text: text
  };
}

// If a c parameter is provided, verify that it matches the current character.
function next(c) {
  if (c && c !== ch)
    error('Expected \'' + c + '\' instead of \'' + ch + '\'');
  // Get the next character. When there are no more characters,
  // return the empty string.
  ch = text.charAt(at);
  at += 1;
  return ch;
}

// Parse a number value.
function number() {
  var number,
    string = '';
  if (ch === '-') {
    string = '-';
    next('-');
  }
  while (ch >= '0' && ch <= '9') {
    string += ch;
    next();
  }
  if (ch === '.') {
    string += '.';
    while (next() && ch >= '0' && ch <= '9') {
      string += ch;
    }
  }
  if (ch === 'e' || ch === 'E') {
    string += ch;
    next();
    if (ch === '-' || ch === '+') {
      string += ch;
      next();
    }
    while (ch >= '0' && ch <= '9') {
      string += ch;
      next();
    }
  }
  number = +string;
  if (!isFinite(number)) {
    error('Bad number');
  } else {
    // Long numbers has stricter check: everything with length > 15 digits
    // disallowed
    if (string.length > 15)
      if (-1 == string.indexOf('.')) {
        return new Int64(hex2dec.decToHex(string));
      }
    return number;
  }
}

// Parse a string value.
function string() {
  var hex;
  var i;
  var string = '';
  var uffff;
  // When parsing for string values, we must look for ' and \ characters.
  if (ch === '"') {
    while (next()) {
      if (ch === '"') {
        next();
        return string;
      }
      if (ch === '\\') {
        next();
        if (ch === 'u') {
          uffff = 0;
          for (i = 0; i < 4; i += 1) {
            hex = parseInt(next(), 16);
            if (!isFinite(hex)) {
              break;
            }
            uffff = uffff * 16 + hex;
          }
          string += String.fromCharCode(uffff);
        } else if (typeof escapee[ch] === 'string') {
          string += escapee[ch];
        } else {
          break;
        }
      } else {
        string += ch;
      }
    }
  }
  error('Bad string: ' + ch);
}

// Skip whitespace.
function white() {
  while (ch && ch <= ' ')
    next();
}

// true, false, or null.
function word() {
  switch (ch) {
    case 't':
      next('t');
      next('r');
      next('u');
      next('e');
      return true;
    case 'f':
      next('f');
      next('a');
      next('l');
      next('s');
      next('e');
      return false;
    case 'n':
      next('n');
      next('u');
      next('l');
      next('l');
      return null;
  }
  error('Unexpected: ' + ch);
}

// Parse an array value.
function array() {
  var array = [];

  if (ch === '[') {
    next('[');
    white();
    if (ch === ']') {
      next(']');
      return array;   // empty array
    }
    while (ch) {
      array.push(value());
      white();
      if (ch === ']') {
        next(']');
        return array;
      }
      next(',');
      white();
    }
  }
  error('Bad array');
}

// Parse an object value.
function object() {
  var key;
  var object = {};
  if (ch === '{') {
    next('{');
    white();
    if (ch === '}') {
      next('}');
      return object;   // empty object
    }
    while (ch) {
      key = string();
      white();
      next(':');
      if (strict && Object.hasOwnProperty.call(object, key))
        error('Duplicate key \'' + key + '\'');
      object[key] = value();
      white();
      if (ch === '}') {
        next('}');
        return object;
      }
      next(',');
      white();
    }
  }
  error('Bad object');
}

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.
function value() {
  white();
  switch (ch) {
    case '{':
      return object();
    case '[':
      return array();
    case '"':
      return string();
    case '-':
      return number();
    default:
      return ch >= '0' && ch <= '9' ? number() : word();
  }
}

function parse(source, reviver) {
  var result;
  text = source;
  at = 0;
  ch = ' ';
  result = value();
  white();
  if (ch)
    error('Syntax error');

  // If there is a reviver function, we recursively walk the new structure,
  // passing each name/value pair to the reviver function for possible
  // transformation, starting with a temporary root object that holds the result
  // in an empty key. If there is not a reviver function, we simply return the
  // result.
  return typeof reviver === 'function'
    ? (function walk(holder, key) {
    var k, v, value = holder[key];
    if (value && typeof value === 'object') {
      for (k in value) {
        if (Object.prototype.hasOwnProperty.call(value, k)) {
          v = walk(value, k);
          if (v !== undefined)
            value[k] = v;
          else
            delete value[k];
        }
      }
    }
    return reviver.call(holder, key, value);
  }({'': result}, ''))
    : result;
}

module.exports = parse;