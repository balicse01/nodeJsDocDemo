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

var fs = require('fs');
var assert = require('assert');
var Int64 = require('node-int64');
var client = require('../nosqldb');
var types = client.Types;
var test_util = require('./util');
var crypto = require('crypto');

describe('Setup', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  var row = new test_util.Row();
  var row_child = new test_util.Row_child();

  var durability =
    new types.Durability(types.SyncPolicy.NO_SYNC,
      types.ReplicaAckPolicy.SIMPLE_MAJORITY,
      types.SyncPolicy.NO_SYNC);
  var writeOptions = new types.WriteOptions(durability, 1000);

  // Preparing store
  var store = client.createStore(configuration);

  this.timeout(50000);

  before(function (done) {
    store.open(done);
  });
  after(function(done) {
    store.close(done);
  });

  it('Should setup test table', function (done) {

    var TABLE_NAME = test_util.TABLE_NAME;
    var TABLE_DEFINITION = test_util.TABLE_DEFINITION;

    console.log('      Creating table for testing: ' + TABLE_NAME);
    store.execute(
      ' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + TABLE_DEFINITION,
      function (err) {
        if (err)
          done(err);
        else
          store.refreshTables(done);
      }); // execute
  }); // it
  it('Should setup test table2', function (done) {

    var TABLE_NAME = test_util.TABLE_NAME+'2';
    var TABLE_DEFINITION = test_util.TABLE_DEFINITION;

    console.log('      Creating table for testing: ' + TABLE_NAME);
    store.execute(
      ' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + TABLE_DEFINITION,
      function (err) {
        if (err)
          done(err);
        else
          store.refreshTables(done);
      }); // execute
  }); // it
  it('Should setup test table3', function (done) {

    var TABLE_NAME = test_util.TABLE_NAME+'3';
    var TABLE_DEFINITION = test_util.TABLE_DEFINITION;

    console.log('      Creating table for testing: ' + TABLE_NAME);
    store.execute(
      ' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + TABLE_DEFINITION,
      function (err) {
        if (err)
          done(err);
        else
          store.refreshTables(done);
      }); // execute
  }); // it

  it('Should setup test index1', function (done) {

    var TABLE_NAME = test_util.TABLE_NAME;
    var TABLE_IDX = test_util.TABLE_IDX1;

    console.log('      Creating table for testing: ' + TABLE_NAME);
    store.execute(
      ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
      ' ON ' + TABLE_NAME + ' ( indexKey1 ) ',
      function (err) {
        if (err)
          done(err);
        else
          store.refreshTables(done);
      }); // execute
  }); // it

  it('Should setup test index2', function (done) {

    var TABLE_NAME = test_util.TABLE_NAME;
    var TABLE_IDX = test_util.TABLE_IDX2;

    console.log('      Creating table for testing: ' + TABLE_NAME);
    store.execute(
      ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
      ' ON ' + TABLE_NAME + ' ( indexKey2 ) ',
      function (err) {
        if (err)
          done(err);
        else
          store.refreshTables(done);
      }); // execute
  }); // it

  it('Should setup child test table', function (done) {

    var TABLE_NAME = test_util.TABLE_NAME_CHILD;
    var TABLE_DEFINITION = test_util.TABLE_CHILD_DEFINITION;

    console.log('      Creating child table for testing: ' + TABLE_NAME);
    store.execute(
      ' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + TABLE_DEFINITION,
      function (err) {
        if (err)
          done(err);
        else
          store.refreshTables(done);
      }); // execute
  }); // it

  it('Should setup data on parent table', function (done) {
    var TABLE_NAME = test_util.TABLE_NAME;
    var TOTAL_SHARDS = 10;
    var ROWS_SHARD = 100;
    var TOTAL_ROWS = TOTAL_SHARDS * ROWS_SHARD;

    console.log('      Inserting test data on parent table...');
    console.log('      Rows insterted: ');
    for (var shard_id = 0; shard_id < TOTAL_SHARDS; shard_id++) {
      row.shardKey = shard_id;
      row.indexKey1 = shard_id;
      row.indexKey2 = shard_id;

      for (var id = 0, exitCond = 0; id < ROWS_SHARD; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err) {
          if (err) {
            id = ROWS_SHARD;
            shard_id = TOTAL_SHARDS;
            done(err);
          }
            if (exitCond % 100 == 0)
            console.log(exitCond);
          if (++exitCond === TOTAL_ROWS) {
            console.log(TOTAL_ROWS);
            console.log('      Data ready.');
            done();
          }
        });
      } // for-id
    } // for-shard
  }); // it

  it('Should setup random data on parent table', function (done) {
    var TABLE_NAME = test_util.TABLE_NAME;
    var shard_id = 99;
    var TOTAL_ROWS = 100;
    console.log('      Inserting test data on parent table...');

    for (var id = 0, exitCond = 0; id <= TOTAL_ROWS; id++) {
      var row = new test_util.RandomRow(shard_id);
      row.id = id;
      row.s = test_util.calculateHashRow(row);
      var hash = test_util.calculateHashRow(row);
      store.put(TABLE_NAME, row, function (err) {
        if (err) {
          id = TOTAL_ROWS;
          done(err);
        }
        if (++exitCond === TOTAL_ROWS) {
          console.log('      Data ready.');
          done();
        }
      });
    } // for-id
  }); // it

  it('Should setup data on child table', function (done) {
    var TABLE_NAME = test_util.TABLE_NAME_CHILD;
    var TOTAL_SHARDS = 10;
    var ROWS_SHARD = 100;
    var TOTAL_ROWS = TOTAL_SHARDS * ROWS_SHARD;

    console.log('      Inserting test data on child table...');
    console.log('      Rows insterted: ');
    for (var shard_id = 0; shard_id < TOTAL_SHARDS; shard_id++) {
      row_child.id = shard_id;
      row_child.shardKey = shard_id;

      for (var id = 0, exitCond = 0; id < ROWS_SHARD; id++) {
        row_child.id_child = id;
        store.put(TABLE_NAME, row_child, function (err) {
          if (err) {
            // exit for
            id = ROWS_SHARD;
            shard_id = TOTAL_SHARDS;
            done(err);
          }
          if (exitCond % 100 == 0)
            console.log(exitCond);
          if (++exitCond === TOTAL_ROWS) {
            console.log(TOTAL_ROWS);
            console.log('      Data ready.');
            done();
          }
        });
      } // for-id
    } // for-shard
  }); // it

  it('Will setup data for background test', function (done) {
    this.timeout(1000000);
    var TABLE_NAME = test_util.TABLE_NAME + '_BACK';
    var TABLE_DEF = test_util.TABLE_DEFINITION;
    var TOTAL_ROWS = 10000;
    console.log('        This may take a while...');
    row.bin = null;
    store.execute(
      ' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' ' + TABLE_DEF,
      function (err, result) {
        store.refreshTables();
        if (err)
          done(err);
        else {
          assert(result != null, 'Result expected');
          var putCount = 1;
          console.log('        Pushing...');
          for (var id = 0; id < TOTAL_ROWS; id++) {
            var row = new test_util.RandomRow(id, 1);
            store.putIfAbsent(TABLE_NAME, row, function (err) {
              if (err)
                assert(err == null, 'No error expected');
              putCount++;
              if (putCount % 500 == 0)
                console.log(putCount);
              if (putCount == TOTAL_ROWS) {
                done();
              }
            }); // putIfAbsent
          }
        }
      });

  });

});
