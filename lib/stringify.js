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

var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
var gap;
var indent;
var rep;
var meta = {  // table of character substitutions
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '"' : '\\"',
  '\\': '\\\\'
};

// Format integers to have at least two digits.
function f(n) {
  return n < 10 ? '0' + n : n;
}

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.
function quote(string) {
  escapable.lastIndex = 0;
  return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
    var c = meta[a];
    return typeof c === 'string'
      ? c
      : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
  }) + '"' : '"' + string + '"';
}

// Produce a string from holder[key].
function str(key, holder) {
  var count; // The loop counter.
  var key; // The member key.
  var v; // The member value.
  var length;
  var mind = gap;
  var partial;
  var value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.
  if (value && typeof value === 'object' &&
    typeof value.toJSON === 'function') {
    value = value.toJSON(key);
  }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.
  if (typeof rep === 'function') {
    value = rep.call(holder, key, value);
  }

  // What happens next depends on the value's type.
  switch (typeof value) {
    case 'string':
      return quote(value);

    // JSON numbers must be finite. Encode non-finite numbers as null.
    case 'number':
      return isFinite(value) ? String(value) : 'null';

    // If the value is a boolean or null, convert it to a string. Note:
    // typeof null does not produce 'null'. The case is included here in
    // the remote chance that this gets fixed someday.
    case 'boolean':
    case 'null':
      return String(value);

    // If the type is 'object', we might be dealing with an object or an array
    // or null.
    case 'object':

      // Due to a specification blunder in ECMAScript, typeof null is 'object',
      // so watch out for that case.
      if (!value)
        return 'null';

      if (value instanceof Int64)
        return hex2dec.hexToDec(value.toOctetString());

      // Make an array to hold the partial results of stringifying this object
      // value.
      gap += indent;
      partial = [];

      // Is the value an array?
      if (Object.prototype.toString.apply(value) === '[object Array]') {

        // The value is an array. Stringify every element. Use null as a
        // placeholder for non-JSON values.
        length = value.length;
        for (count = 0; count < length; count += 1) {
          partial[count] = str(count, value) || 'null';
        }

        // Join all of the elements together, separated with commas, and wrap
        // them in brackets.
        v = partial.length === 0
          ? '[]'
          : gap
          ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
          : '[' + partial.join(',') + ']';
        gap = mind;
        return v;
      }

      // If the replacer is an array, use it to select the members to be
      // stringified.
      if (rep && typeof rep === 'object') {
        length = rep.length;
        for (count = 0; count < length; count += 1) {
          if (typeof rep[count] === 'string') {
            key = rep[count];
            v = str(key, value);
            if (v) {
              partial.push(quote(key) + (gap ? ': ' : ':') + v);
            }
          }
        }
      } else { // Otherwise, iterate through all of the keys in the object.
        for (key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            v = str(key, value);
            if (v) {
              partial.push(quote(key) + (gap ? ': ' : ':') + v);
            }
          }
        }
      }

      // Join all of the member texts together, separated with commas,
      // and wrap them in braces.
      v = partial.length === 0
        ? '{}'
        : gap
        ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
        : '{' + partial.join(',') + '}';
      gap = mind;
      return v;
  }
}

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.
function stringify(value, replacer, space) {
  var count;
  gap = '';
  indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.
  if (typeof space === 'number') {
    for (count = 0; count < space; count += 1) {
      indent += ' ';
    }

// If the space parameter is a string, it will be used as the indent string.
  } else if (typeof space === 'string') {
    indent = space;
  }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.
  rep = replacer;
  if (replacer && typeof replacer !== 'function' &&
    (typeof replacer !== 'object' ||
    typeof replacer.length !== 'number')) {
    throw new Error('JSON.stringify');
  }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.
  return str('', {'': value});
}

module.exports = stringify;