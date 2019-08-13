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
var client = require('../nosqldb');
var types = client.Types;
var test_util = require('./util');

describe('Oracle NoSQLDB', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  var TEST_ID = 6;
  var row = new test_util.Row();
  row.shardKey = TEST_ID;
  row.indexKey1 = TEST_ID;
  row.indexKey2 = TEST_ID;

  var durability =
    new types.Durability(types.SyncPolicy.NO_SYNC,
      types.ReplicaAckPolicy.SIMPLE_MAJORITY,
      types.SyncPolicy.NO_SYNC);
  var writeOptions = new types.WriteOptions(durability, 1000);
  var readOptions =
    new types.ReadOptions(types.SimpleConsistency.NONE_REQUIRED, 1000);

  // Preparing store
  var store = client.createStore(configuration);

  var TABLE_NAME = test_util.TABLE_NAME;
  var TABLE_DEFINITION = test_util.TABLE_DEFINITION;

  var TABLE_IDX1 = test_util.TABLE_IDX1;
  var primaryKey = {shardKey: TEST_ID};
  var FIELD_RANGE_START = '0';
  var FIELD_RANGE_END = '200';
  var fieldRange = new types.FieldRange('id', FIELD_RANGE_START, true,
    FIELD_RANGE_END, true);

  describe('Readable Streams', function () {

    // execute this before all test cases
    before(function (done) {
      this.timeout(10000);
      test_util.checkSetup(store, done);
    }); // before
    after(function(done) {
        store.close(done);
    });

    describe('TableStream', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.tableStream(null, primaryKey, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter tableName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.tableStream('wrong', primaryKey,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null primaryKey ', function (done) {
        try {
          store.tableStream(TABLE_NAME, null, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter primaryKey is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong primaryKey ', function (done) {
        store.tableStream(TABLE_NAME, {wrong: 0}, {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'PrimaryKey is missing fields',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should get Readable Stream Items with [id] from ' +
        FIELD_RANGE_START + ' to ' + FIELD_RANGE_END + ' - FORWARD',
        function (done) {

          store.tableStream(TABLE_NAME, primaryKey,
            {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.FORWARD
            },
            function (err, stream) {
              if (err)
                done(err);
              else {
                row.id = FIELD_RANGE_START;
                var total = 0;
                var totalRows = 0;
                stream.on('data', function (data) {
                  var rows = test_util.split(data.toString(), '}{');
                  for (var key in rows) {
                    var currentRow = store.parse(rows[key]);
                    var res = test_util.compareRows(currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);
                    total = total + data.length;
                    row.id++;
                    totalRows++;
                  }
                }).on('end', function () {
                  console.log('          ' + total + ' bytes received in ' +
                  totalRows + ' rows.');
                  done();
                }).on('error', function (err) {
                  done(err);
                });
              }
            }); // tableStream
        }); // it

  }); // describe

    describe('TableKeyStream', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.tableKeyStream(null, primaryKey, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter tableName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.tableKeyStream('wrong', primaryKey,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null primaryKey ', function (done) {
        try {
          store.tableKeyStream(TABLE_NAME, null, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter primaryKey is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong primaryKey ', function (done) {
        store.tableKeyStream(TABLE_NAME, {wrong: 0}, {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'PrimaryKey is missing fields',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });


      it('Simple call tableKeyStream() with [id] from ' +
        FIELD_RANGE_START + ' to ' + FIELD_RANGE_END + ' - FORWARD',
        function (done) {
          store.tableKeyStream(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.FORWARD
            },
            function (err, stream) {
              if (err)
                done(err);
              else {
                var total = 0;
                var primaryKey = {shardKey: TEST_ID, id: FIELD_RANGE_START};
                var totalKeys = 0;
                stream.on('data', function (data) {
                  var key = store.parse(data.toString());
                  var res = test_util.compareRows(primaryKey, key);
                  assert(res === null, 'Error verifying result: ' + res);
                  total = total + data.length;
                  primaryKey.id++;
                  totalKeys++;
                }).on('end', function () {
                  console.log('          ' + total + ' bytes received in ' +
                  totalKeys + ' keys.');
                  done();

                }).on('error', function (err) {
                  done(err);
                });
              }
            }); // tableKeyStream
        });

    });  // describe TableKeyIterator

    describe('IndexStream', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.indexStream(null, primaryKey, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter tableName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.indexStream('wrong', TABLE_IDX1,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null IndexName ', function (done) {
        try {
          store.indexStream(TABLE_NAME, null, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter indexName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong indexName ', function (done) {
        store.indexStream(TABLE_NAME, 'wrong', {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'Not a valid index name',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Simple call indexStream() with indexKey', function (done) {
        var indexKey = {indexKey1: TEST_ID};
        this.timeout(2000);
        store.indexStream(TABLE_NAME, TABLE_IDX1,
          {
            indexKey: indexKey,
            readOptions: readOptions, direction: types.Direction.FORWARD
          },
          function (err, stream) {
            if (err)
              done(err);
            else {
              var total = 0;
              row.id = FIELD_RANGE_START;
              var totalKeys = 0;
              stream.on('data', function (data) {
                var row = store.parse(data.toString());
                var res = test_util.compareRows(primaryKey, row);
                assert(res === null, 'Error verifying result: ' + res);
                total = total + data.length;
                row.id++;
                totalKeys++;
              }).on('end', function () {
                console.log('          ' + total + ' bytes received in ' +
                totalKeys + ' rows.');
                done();
              }).on('error', function (err) {
                done(err);
              });
            }
          }); // indexStream
      }); // it

      it('Simple call indexStream() with fieldRange', function (done) {
        var FIELD_RANGE_START = '1';
        var FIELD_RANGE_END = '3';
        var fieldRange = new types.FieldRange('indexKey1', FIELD_RANGE_START,
          true, FIELD_RANGE_END, true);
        this.timeout(2000);
        store.indexStream(TABLE_NAME, TABLE_IDX1,
          {
            fieldRange: fieldRange,
            readOptions: readOptions, direction: types.Direction.FORWARD
          },
          function (err, stream) {
            if (err)
              done(err);
            else {
              var total = 0;
              var totalRows = 0;
              stream.on('data', function (data) {
                // we can receive more than one row
                var rows = test_util.split(data.toString(), '}{');
                for (var index in rows) {
                  if (rows[index].length > 0) {  // avoid garbage
                    if (rows[index].charAt() !== '{')  // fix '{' from split
                      rows[index] = '{' + rows[index];
                    var stream_row = store.parse(rows[index]);
                    assert(((stream_row.indexKey1 >= FIELD_RANGE_START) &&
                      stream_row.indexKey1 <= FIELD_RANGE_END),
                      'Error verifying result ');
                    total = total + data.length;
                    totalRows++;
                  }
                }
              }).on('end', function () {
                console.log('          ' + total + ' bytes received in ' +
                totalRows + ' rows.');
                done();
              }).on('error', function (err) {
                done(err);
              });
            }
          }); // indexStream
      }); // it

    });

    describe('IndexKeyStream', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.indexKeyStream(null, primaryKey, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter tableName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.indexKeyStream('wrong', TABLE_IDX1,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null IndexName ', function (done) {
        try {
          store.indexKeyStream(TABLE_NAME, null, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error,
            'The parameter indexName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong indexName ', function (done) {
        store.indexKeyStream(TABLE_NAME, 'wrong', {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'Not a valid index name',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });


      it('Simple call indexKeyStream()', function (done) {
        var indexKey = {indexKey1: TEST_ID};
        this.timeout(2000);
        store.indexKeyStream(TABLE_NAME, TABLE_IDX1,
          {
            indexKey: indexKey,
            readOptions: readOptions, direction: types.Direction.UNORDERED
          },
          function (err, stream) {
            if (err)
              done(err);
            else {
              var total = 0;
              var primaryKey = {shardKey: TEST_ID, id: FIELD_RANGE_START};
              var totalKeys = 0;
              stream.on('data', function (data) {
                var keypair =
                    store.parseKeyPair(store.parse(data.toString()));
                var res = test_util.compareRows(primaryKey, keypair.primary);
                assert(res === null, 'Error verifying result: ' + res);
                total = total + data.length;
                primaryKey.id++;
                totalKeys++;
              }).on('end', function () {
                console.log('          ' + total + ' bytes received in ' +
                totalKeys + ' keys.');
                done();

              }).on('error', function (err) {
                done(err);
              });

            }
          }); // indexKeyStream
      });

    });  // describe IndexIterator

  });

});
