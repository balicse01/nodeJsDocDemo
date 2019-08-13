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

/*global Logger*/
/*global LOG_LEVELS*/
/*global Errors*/
/*global Types*/

var Parse = require('./parse');
var EventEmitter = require('events').EventEmitter;
util.inherits(Iterator, EventEmitter);


/**
 * Iterator object.
 * Contains a set of rows as result of parameters sent to the method
 * that generated this object.
 * @function {rowCallback} next Returns the next row if available.
 * @function {rowCallback} getCurrent Returns the current row if available.
 * @function {rowCallback} forEach Returns all the rows in sequence from
 * this iterator executing the function for every row.
 * @function {closeIteratorCallback} close Closes this iterator and free resources.
 * @class Iterator
 */
function Iterator(/*client*/ client, /*TIteratorResult*/ iteratorResult,
                  /*Object*/ ResultType) {
  EventEmitter.call(this);
  var self = this;
  var iteratorId = iteratorResult.iteratorId;
  var closed = false;
  var buffer =
    new ResultType(iteratorResult.result).returnRows;
  var hasMore = iteratorResult.hasMore;
  var index, length;
  var buffering = false;
  resetIndexes();

  function reportError(error, callback) {
    callback = callback || function(){};
    Logger.error(error);
    callback(error);
    try {
      this.emit('error', error);
    } catch (error) {
      Logger.debug("No error event available to catch error: " + error);
    }
  }

  function resetIndexes() {
    index = 0;
    length = buffer.length - 1;
  }

  function isClosed() {
    return closed;
  }

  this.isClosed = isClosed;

  function next(callback) {
    callback = callback || function () {};
    if (closed)
      callback(new Errors.IteratorError('This Iterator is closed'));

    if (length >= index) {  //Available from buffer
      var row = buffer[index++];
      callback(null, row);
      self.emit('data', row);
      return;
    }
    if (hasMore) {
      buffering = true;
      client.iteratorNext(iteratorId, function (err, iteratorResult) {
        if (err) {
          var error = Errors.getProxyError(err, 'iterator.next()');
          reportError(error, callback);
        } else if (iteratorResult != null) {
          buffer =
            new ResultType(iteratorResult.result).returnRows;
          hasMore = iteratorResult.hasMore;
          resetIndexes();
          var row = buffer[index++];
          callback(null, row);
          self.emit('data', row);
        } else {
          hasMore = false;
          buffer = [];
          resetIndexes();
          callback(new Errors.IteratorError('No more elements on Iterator'));
          self.emit('done');
        }
      });
    } else {
      callback(new Errors.IteratorError('No more elements on Iterator'));
      self.emit('done');
    }
  }

  this.next = next;

  function getCurrent(callback) {
    callback = callback || function () {};
    Logger.debug('Iterator - getCurrent');

    var _index = index - 1;
    if (closed) {
      callback(new Errors.IteratorError('This Iterator is closed'));
      return;
    }
    if (length >= _index) {
      callback(null, buffer[_index]);
      self.emit('data', buffer[_index]);
    }
  }
  this.getCurrent = getCurrent;

  function forEach(callback) {
    callback = callback || function(){};
    Logger.debug('Iterator - forEach');
    if (closed) {
      callback(new Errors.IteratorError('This Iterator is closed'));
      return;
    }
    var lastEntry = false;
    while (true) { //Depleting buffer
      if (length >= index) {
        var row = buffer[index++];
        callback(null, row);
        self.emit('data', row);
      } else if (hasMore) {
        client.iteratorNext(iteratorId, function (err, iteratorResult) {
          if (err) {
            var error = Errors.getProxyError(err, 'iterator.next()');
            reportError(error, callback);
          } else if (iteratorResult != null) {
            buffer =
              new ResultType(iteratorResult.result).returnRows;
            hasMore = iteratorResult.hasMore;
            resetIndexes();
            forEach(callback);
          } else {
            hasMore = false;
            buffer = [];
            lastEntry = true;
            resetIndexes();
            callback(new Errors.IteratorError('No more elements on Iterator'));
            self.emit('done');
          }
        });
        break;
      } else {
        lastEntry = true;
        break;
      }

    }
    if (lastEntry)  // Means this is the last entry, no more items available
      self.emit('done');
  }

  this.forEach = forEach;

  function close(callback) {
    callback = callback || function(){};
    Logger.debug('Iterator - close');
    if (closed) {
      var error = new Errors.IteratorError('This Iterator is closed');
      callback(error);
      self.emit('error', error);
      return;
    }

    client.iteratorClose(iteratorId, function closingIterator(err) {
      if (err) {
        var error = Errors.getProxyError(err, 'iterator.next()');
        reportError(error, callback);
      } else {
        callback();
        self.emit('close');
      }
    });

  }

  this.close = close;
}
/**
 * @callback closeIteratorCallback
 * @param {Error} error The error returned by the operation, if any, null
 *  otherwise.
 */
/**
 * @callback rowCallback
 * @param {Error} error The error returned by the operation, if any, null
 *  otherwise.
 * @param {ReturnRow} result A result Object object with the row and
 * metadata as result.
 */

/**
 * Called when an error occurred
 * @event Iterator#error
 */

/**
 * Called when the Iterator is closed
 * @event Iterator#close
 */

/**
 * Called when the Iterator has data to be read
 * @event Iterator#data
 */

/**
 * Called when there is no more data available in the Iterator
 * @event Iterator#done
 */

module.exports = Iterator;
