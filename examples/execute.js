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
 * This example demonstrates the execute method. The example:
 * - Creates a table.
 * - Puts 100000 rows on the table.
 * - Creates an index over the populated table.
 * - Gets a row.
 * - Deletes the index.
 * - Intermittently executes a function concurrent to the activity above
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

var TABLE_NAME = 'test_table_EXECUTE';
var TABLE_IDX = 'test_table_EXECUTE_IDX';

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
  function (err, result) {
    store.refreshTables();
    if (err)
      throw err;
    else {

      row.shardKey = 1;
      var putCount = 1;
      var finishedCreateIndex = false;
      var finishedRead = false;
      var finishedDropIndex = false;

      console.log('Pushing a lot of data...');
      for (var id = 0; id < 100000; id++) {
        row.id = id;
        store.putIfAbsent(TABLE_NAME, row, function (err, result) {
          if (err)
            console.log(err);
          putCount++;

          // When done putting:
          if (putCount == 100000) {

            // STEP 1
            console.log('Step 1: REQUEST: Creating index...');
            store.execute(
              ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
              ' ON ' + TABLE_NAME + ' ( indexKey1 ) ',
              function (err) {
                if (err)
                  console.log(err);
                else
                  console.log('Step 1: ANSWER: Index created now...');
                finishedCreateIndex = true;
              }); // execute

            // STEP 2
            console.log('Step 2: REQUEST: Asking data from table');
            store.get(TABLE_NAME, {shardKey: 1, id: 2}, function (err, result) {
              console.log(
                'Step 2: ANSWER: This is the get result from the same table');
              finishedRead = true;
            });

            // STEP 3
            console.log('Step 3: REQUEST: Dropping index...');
            store.execute(
              ' DROP INDEX ' + TABLE_IDX + ' ON ' + TABLE_NAME,
              function (err) {
                if (err)
                  console.log(err);
                else
                  console.log('Step 3: ANSWER: Index dropped now...');
                finishedDropIndex = true;
              }); // execute

            // STEP X
            var fun = setInterval(function () {
              console.log('Step X: Waiting for all to finish...');
              if (finishedCreateIndex && finishedRead && finishedDropIndex) {
                clearInterval(fun);
                store.close();
              }
            }, 2000); // Every two seconds
          }
        });
      }
    }
  }

  )
  ;
});
