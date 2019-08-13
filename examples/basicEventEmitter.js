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
 * This example demonstrates basic usage of the Oracle NoSQL Database JS API
 * using the EventEmitter pattern. The example:
 * - Creates a table.
 * - Puts a row in the table.
 * - Gets the row from the table.
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

// Set a writeOptions object:
var writeOptions =
  new Types.WriteOptions(
    new Types.Durability(
      Types.SyncPolicy.NO_SYNC,
      Types.ReplicaAckPolicy.ALL,
      Types.SyncPolicy.NO_SYNC),
    1000);
// Set a readOptions object:
var readOptions =
  new Types.ReadOptions(
    Types.SimpleConsistency.NONE_REQUIRED,
    1000);

// Create a store with the specified configuration
var store = nosqldb.createStore(configuration);

var TABLE_NAME = 'example_table';

store.on('open', function () {

  console.log('Connected to the store: ' +
              configuration.storeName + ' at ' +
              configuration.storeHelperHosts);

  // Create a table
  store.execute(' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME +
                ' ( id long, name string, PRIMARY KEY(id) ) ', function (err) {
    if (err) return;

    store.refreshTables(function (err) {
      if (err) return;

      console.log('Created table ' + TABLE_NAME);

      var row = {id: 1, name: 'John Doe'};
      console.log('Inserting row: ' + util.inspect(row));
      store.put(TABLE_NAME, row, writeOptions,
        function (err, result) {
          if (err)
            throw err;
          else {
            // This is the primary key
            var pKey = {id: 1};

            store.get(TABLE_NAME, pKey, readOptions,
                      function (error, result) {
                console.log('Read row: ' + util.inspect(result.currentRow));
                // Closing...
                store.close();
              });// get
          }
        }); // Put
    }); // RefreshTables
  }); // Execute
}).on('close', function () {
  console.log('Store closed, shutting down KVProxy...');
  store.shutdownProxy(function (err) {
    if (err)
      throw err;
    console.log('KVProxy off.')
  });
}).on('error', function (err) {
  throw err;
});

// Opening to activate event 'open'
store.open();
