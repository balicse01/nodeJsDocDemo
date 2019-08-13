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

var parse = require('./parse');

var readable = require('stream').Readable;
util.inherits(Readable, readable);

/**
 * Readable Stream object.
 * Contains a set of rows as result of parameters sent to the method
 * that generated this object.
 * The result is obtained via standard readable stream usage.
 * For more information about how the Streams work please refer to:
 * https://nodejs.org/api/stream.html
 * @class Readable
 */
function Readable(/*Store*/ store, /*TIteratorResult*/ result) {
  readable.call(this);
  var self = this;

  var client = store.thriftClient;
  var iteratorId = result.iteratorId;
  var buffer = result.result.rowsWithMetadata;
  var hasMore = result.hasMore;
  var index = 0;
  var length = buffer.length - 1;
  var buffering = false;
  var countRead = 0;

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

  self._read = function _read(n) {
    if (buffering)
      return self.push('');

    if (length >= index) {
      return self.push(buffer[index++].jsonRow);
    }

    if (hasMore) {
      buffering = true;
      Logger.debug('[STREAM] Calling for the next chunk of data...');
      client.iteratorNext(iteratorId, function (err, result) {
        if (err) {
          var error = Errors.getProxyError(err, 'readable._read()');
          reportError(error);
          return self.push(null);
        } else if (result) {
          hasMore = result.hasMore;
          buffer = result.result.rowsWithMetadata;
          index = 0;
          length = buffer.length - 1;
        }
        buffering = false;
        self.resume();
      }); // iteratorNext
      self.pause();
      return self.push('');
    }
    return self.push(null);
  }
}
/**
 * Called when an error occurred
 * @event Readable#error
 */

/**
 * Called when the Stream has data to be read
 * @event Readable#data
 */

/**
 * Called when there is no more data available in the Stream
 * @event Readable#end
 */

module.exports = Readable;
