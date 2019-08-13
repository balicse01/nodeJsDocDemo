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

/**
 * This example demonstrates use of the indexIterator method and
 * stopping iteration without handling all rows. The example:
 * - Creates a table.
 * - Creates an index on the table.
 * - Puts 100 rows on the table.
 * - Creates an Iterator based on the Index.
 * - Gets the rows from the Iterator.
 * - Stops at 50th element.
 */

// Include nosqldb-oraclejs module
//var nosqldb = require('nosqldb-oraclejs');
var nosqldb = require('../nosqldb');
var Types = nosqldb.Types;

// Create a configuration object
var configuration = new nosqldb.Configuration();
configuration.proxy.startProxy = true;
configuration.proxy.host = 'localhost:5010';
configuration.storeHelperHosts = ['localhost:5000'];
configuration.storeName = 'kvstore';

// Set a readOptions object:
var readOptions =
  new Types.ReadOptions(
    Types.SimpleConsistency.NONE_REQUIRED,
    1000);

var TABLE_NAME = 'test_table_INDEX_ITERATOR';
var TABLE_IDX = 'test_table_INDEX_ITERATOR_IDX';

var row = {
  id: 1,
  shardKey: 1,
  indexKey1: 1,
  indexKey2: 1,
  s: 'String value',
  address: {
    street: 'address street', city: 'address city',
    state: 'address state', zip: 55555
  },
  m: {field1: 'map field 1', field2: 'map field 2'}
};

// Create a store with the specified configuration
var store = nosqldb.createStore(configuration);

store.open(function (err) {
  if (err)
    throw err;
  // Create a table
  console.log('create table');
  store.execute(
    'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME +
    ' ( shardKey INTEGER, ' +
    '   id INTEGER, ' +
    '   indexKey1 INTEGER, ' +
    '   indexKey2 INTEGER, ' + '' +
    '   s STRING, ' +
    '   address RECORD ' +
    '     (street STRING, city STRING, state STRING, ' +
    '      zip INTEGER), ' +
    '   m MAP (STRING), ' +
    '   primary KEY(SHARD(shardKey), id) ) ',
    function (err) {
      if (err)
        throw err;
      else {

        // Create an index...
        console.log('Creating index ' + TABLE_IDX);
        store.execute(
          ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
          ' ON ' + TABLE_NAME + ' ( indexKey1 ) ',
          function (err) {
            if (err)
              throw err;
            else {
              // Put some data in the table
              console.log('Add data to the table');
              for (var i = 0; i < 100; i++) {
                  row.id = i;
                  row.indexKey1 = i;
                  store.put(TABLE_NAME, row);
              }

              // Create the iterator over a range
              var fieldRange = new Types.FieldRange('indexKey1', 0, true, 99,
                true);
              store.indexIterator(TABLE_NAME, TABLE_IDX,
                {
                  fieldRange: fieldRange, readOptions: readOptions,
                  direction: Types.Direction.FORWARD
                },
                function (err, iterator) {
                  if (err)
                    throw err;
                  else {

                    iterator.on('done', function () {
                      console.log('done.');
                      store.close()
                    }).on('close', function() {
                      console.log('done.');
                      store.close();  // and that's it...
                    });
                    console.log('Rows retrieved from the index:');
                    var recursiveCall = function recursiveCall() {
                      iterator.next(function (err, returnRow) {
                        console.log(returnRow.row.id + ' ');

                        // Stop at the 50th element
                        if (returnRow.row.id == 50) {
                          console.log('Closing iterator at 50th result.');
                          iterator.close();
                        } else
                          recursiveCall();
                      });
                    };
                    recursiveCall();
                  }
                }); // IndexIterator
            }
          }); // Execute
      }
    });
});
