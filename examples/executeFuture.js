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
 * This example demonstrates the executeFuture method. The example:
 * - Creates a table.
 * - Creates an index using ExecuteFuture objects.
 * - Executes multiGet while the process is in the background.
 * - Waits for the background process to finish.
 * - Deletes the Index.
 */

// Include nosqldb-oraclejs module
var nosqldb = require('nosqldb-oraclejs');
var Types = nosqldb.Types;

// Create a configuration object
var configuration = new nosqldb.Configuration();
configuration.proxy.startProxy = true;
configuration.proxy.host = 'localhost:5010';
configuration.storeHelperHosts = ['localhost:5000'];
configuration.storeName = 'kvstore';

// Create a store with the specified configuration
var store = nosqldb.createStore(configuration);

var TABLE_NAME = 'test_table_FUTURE';
var TABLE_IDX = 'test_table_FUTURE_IDX';

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

store.open(function (err) {
  if (err)
    throw err;
  // Create table
  console.log('creating table ' + TABLE_NAME);
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

        // Put some data in the table
        console.log('Adding data to the table');
        for (var i = 0; i < 10000; i++) {
          row.id = i;
          row.indexKey1 = i;
          store.put(TABLE_NAME, row);
        }

        // Create an index with executeFuture
        // Normally indexes should be created before data is added, but
        // this is done after for purposes of the example
        console.log('Creating index ' + TABLE_IDX + ' asynchronously using ' +
                    'a future');
        store.executeFuture(
          ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
          ' ON ' + TABLE_NAME + ' ( indexKey1 ) ',
          function (err, executionFuture) {
            if (err)
              throw err;
            else if (!(executionFuture.statementResult.isDone ||
                       executionFuture.statementResult.isCancelled)) {

              // Check the status again...
              console.log('Check status again...');
              executionFuture.updateStatus(function (err) {
                if (err)
                  throw err;
                else {
                  console.log('Info about the process updated.');
                }
              });

              // Execute multiGet() while ExecuteFuture is in the background
              console.log('Executing multiGet() while index creation ' +
                          ' runs in the background');
              store.multiGet(TABLE_NAME, {shardKey: 1, id: 1},
                function (err, result) {
                  if (err)
                    throw err;
                  else
                    console.log(result);
                });

              // Wait for process to finish...
              console.log('Wait for index creation to finish...');
              executionFuture.get(function (err) {
                if (err)
                  throw err;
                else {
                  console.log('Index creation complete.');
                  store.close();
                }
              });
            } else {
              if (executionFuture.statementResult.isDone) {
                console.log('Index already exists, it will be dropped. ' +
                            'Run the example again on return.');
                store.execute(
                  'DROP INDEX IF EXISTS ' + TABLE_IDX + ' ON ' + TABLE_NAME,
                  function (err) {
                    console.log('Index dropped.');
                    store.close();
                    console.log('Store closed.')
                  })
              } else {
                console.log('Unexpected exit...');
                store.close();
              }
            }
          }); // ExecuteFuture
      }
    });
});
