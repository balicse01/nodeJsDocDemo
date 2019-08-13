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
 *   Oracle NoSQL Database is distributed in the hope that it | be useful,
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
var errors = client.Errors;
var test_util = require('./util');


describe('Oracle NoSQLDB', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  var TEST_ID = 5;
  var row = new test_util.Row(TEST_ID);

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

  // execute this before all test cases
  before(function (done) {
    this.timeout(10000);
    test_util.checkSetup(store, done);
  }); // before
  after(function(done) {
    store.close(done);
  });

  describe('put()', function () {

    describe('put() test cases', function () {

      it('Should do a simple put() returing vrsion', function (done) {
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          console.log('result version after put ' + 
          		util.inspect(result.currentRowVersion));
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
          if (err)
            done(err);
          else
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
        });
      });

      it('Should fail with null table name', function (done) {
        try {
          store.put(null, row, writeOptions, function (err, result) {
            throw new Error('Put accepts nulls as table name');
          });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter tableName is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.put('wrong table', row, writeOptions, function (err) {
          if (err) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Should fail with wron table name');
            done();
          } else
            done(new Error('Should throw error a wrong table name'));

        });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'timeout must be >= 0',
            'Expected: timeout must be >= 0');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should do a simple put() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
          if (err)
            done(err);
          else
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
        });
      });

      it('Should do a simple put() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var finalErr = null;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');
          store.put(TABLE_NAME, row, writeOptions, function (err, result) {
            assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            assert(err === null, err);
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                assert(err === null, err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
              }
            });
          });
        }
        done();

      });

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.id = 2147483648;
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.l = 123456.123456;
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.arrStr = 'hello';
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for field',
            'Expected: Illegal value for field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should put with default WriteOptions', function (done) {
        store.put(TABLE_NAME, row, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
          assert(err === null, err);
          store.get(TABLE_NAME, primaryKey, function (err, result) {
            if (err)
              done(err);
            else {
              var res = test_util.compareRows(result.currentRow, row);
              assert(res === null, 'Error verifying result: ' + res);
              done();
            }
          });
        });
      });

      it('Should put with WriteOptions.timeout = 0', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 0;
        store.put(TABLE_NAME, row, writeOptions, done);
      });

      it('Should do a put() with non-zero TTL', function (done) {
          var writeOptions = new types.WriteOptions();
          writeOptions.updateTTL = true;
          row.ttl = new types.TimeToLive(42, types.TimeUnit.HOURS);
          store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            if (err)
              done(err);
            else
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  done(err);
                else {
                  assert(result.expirationTime > 0, 'Expected positive ' 
                		  + ' expiration time but found ' + result.expirationTime);
                  done();
                }
              });
          });
        });

      it('Should get TTL of previous row', function (done) {
          var writeOptions = new types.WriteOptions();
          writeOptions.updateTTL = true;
          writeOptions.returnChoice = types.ReturnChoice.ALL;
          row.ttl = new types.TimeToLive(42, types.TimeUnit.HOURS);
          // put row with TTL
          store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          
          assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            if (err) {
              done(err);
            } else {
                // put (overwrite) row and return previous row with TTL
                writeOptions.returnChoice = types.ReturnChoice.ALL;
                writeOptions.updateTTL = false;
                store.put(TABLE_NAME, row, writeOptions, function (err, result) {
                if (err)
                  done(err);
                else {
                  assert(result.expirationTime > 0, 'Expected positive  '
                      + ' vaue for previous row expiration time= ');
                  done();
                }
              });
            }
          });
        });

      it('Should throw error with null row', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 100;
        var row = null;
        try {
          store.put(TABLE_NAME, row, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should Put with all WriteOptions', function (done) {
        var putCount = TEST_ID, getCount = TEST_ID, backCount = TEST_ID;
        var row = new test_util.Row(TEST_ID);
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        totalKeys += backCount;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);
              row.id = putCount++;
              store.put(TABLE_NAME, row, writeOptions,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  assert(err === null, err);
                  var primaryKey = {shardKey: TEST_ID, id: getCount++};
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    row.id = backCount++;
                    assert(err === null, err);
                    var res = test_util.compareRows(result.currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);

                    if (backCount % 10 == 0)
                      console.log(backCount + '..');
                    if (backCount >= totalKeys) {
                      console.log(totalKeys);
                      done();
                    }

                  });
                });
            }
          }
        }
      })

    });

    describe('putIfAbsent() test cases', function () {

      it('Simple putIfAbsent()', function (done) {

        store.putIfAbsent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            if (err)
              done(err);
            else
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  done(err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  done();
                }
              });
          });
      });

      it('Should fail with null table name', function (done) {
        try {
          store.putIfAbsent(null, row, writeOptions, function (err, result) {
            throw new Error('Put accepts nulls as table name');
          });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter tableName is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.putIfAbsent('wrong table', row, writeOptions, function (err) {
          if (err) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Should fail with wron table name');
            done();
          } else
            done(new Error('Shoudl throw error a wrong table name'));

        });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        store.putIfAbsent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'timeout must be >= 0',
              'Expected: timeout must be >= 0');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should do a simple putIfAbsent() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        store.putIfAbsent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            if (err)
              done(err);
            else
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  done(err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  done();
                }
              });
          });
      });

      it('Should do a simple putIfAbsent() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var finalErr = null;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');
          store.putIfAbsent(TABLE_NAME, row, writeOptions,
            function (err, result) {
              assert(result !== null,
                'Error receiving the result, should not be null');
              var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
              assert(err === null, err);
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  assert(err === null, err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                }
              });
            });
        }
        done();

      });

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.id = 2147483648;
        store.putIfAbsent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'Illegal value for numeric field',
              'Expected: Illegal value for numeric field');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.l = 123456.123456;
        store.putIfAbsent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'Illegal value for numeric field',
              'Expected: Illegal value for numeric field');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.arrStr = 'hello';
        store.putIfAbsent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'Illegal value for field',
              'Expected: Illegal value for field');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should put with default WriteOptions', function (done) {
        store.putIfAbsent(TABLE_NAME, row, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
          assert(err === null, err);
          store.get(TABLE_NAME, primaryKey, function (err, result) {
            if (err)
              done(err);
            else {
              var res = test_util.compareRows(result.currentRow, row);
              assert(res === null, 'Error verifying result: ' + res);
              done();
            }
          });
        });
      });

      it('Should put with WriteOptions.timeout = 0', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 0;
        store.putIfAbsent(TABLE_NAME, row, writeOptions, done);
      });

      it('Should throw error with null row', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 100;
        var row = null;
        try {
          store.putIfAbsent(TABLE_NAME, row, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should Put with all WriteOptions', function (done) {
        var putCount = TEST_ID, getCount = TEST_ID, backCount = TEST_ID;
        var row = new test_util.Row(TEST_ID);
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        totalKeys += backCount;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);
              row.id = putCount++;
              store.putIfAbsent(TABLE_NAME, row, writeOptions,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  assert(err === null, err);
                  var primaryKey = {shardKey: TEST_ID, id: getCount++};
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    row.id = backCount++;
                    assert(err === null, err);
                    var res = test_util.compareRows(result.currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);

                    if (backCount % 10 == 0)
                      console.log(backCount + '..');
                    if (backCount >= totalKeys) {
                      console.log(totalKeys);
                      done();
                    }

                  });
                });
            }
          }
        }
      })

    });

    describe('putIfPresent() test cases', function () {

      it('Simple putIfPresent', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            if (err)
              done(err);
            else
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  done(err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  done();
                }
              });
          });
      });

      it('Should fail with null table name', function (done) {
        try {
          store.putIfPresent(null, row, writeOptions, function (err, result) {
            throw new Error('Put accepts nulls as table name');
          });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter tableName is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.putIfPresent('wrong table', row, writeOptions, function (err) {
          if (err) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Should fail with wrong table name');
            done();
          } else
            done(new Error('Should throw error a wrong table name'));

        });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'timeout must be >= 0',
              'Expected: timeout must be >= 0');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should do a simple putIfPresent - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
            if (err)
              done(err);
            else
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  done(err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  done();
                }
              });
          });
      });

      it('Should do a simple putIfPresent with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var finalErr = null;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');
          store.putIfPresent(TABLE_NAME, row, writeOptions,
            function (err, result) {
              assert(result !== null,
                'Error receiving the result, should not be null');
              var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
              assert(err === null, err);
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  assert(err === null, err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                }
              });
            });
        }
        done();

      });

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.id = 2147483648;
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'Illegal value for numeric field',
              'Expected: Illegal value for numeric field');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.l = 123456.123456;
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'Illegal value for numeric field',
              'Expected: Illegal value for numeric field');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.arrStr = 'hello';
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'Illegal value for field',
              'Expected: Illegal value for field');
            assert(result === undefined, 'No result expected');
            done();
          });
      });

      it('Should put with default WriteOptions', function (done) {
        store.putIfPresent(TABLE_NAME, row, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
          assert(err === null, err);
          store.get(TABLE_NAME, primaryKey, function (err, result) {
            if (err)
              done(err);
            else {
              var res = test_util.compareRows(result.currentRow, row);
              assert(res === null, 'Error verifying result: ' + res);
              done();
            }
          });
        });
      });

      it('Should put with WriteOptions.timeout = 0', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 0;
        store.putIfPresent(TABLE_NAME, row, writeOptions, done);
      });

      it('Should throw error with null row', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 100;
        var row = null;
        try {
          store.putIfPresent(TABLE_NAME, row, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should Put with all WriteOptions', function (done) {
        var putCount = TEST_ID, getCount = TEST_ID, backCount = TEST_ID;
        var row = new test_util.Row(TEST_ID);
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        totalKeys += backCount;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);
              row.id = putCount++;
              store.putIfPresent(TABLE_NAME, row, writeOptions,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  assert(err === null, err);
                  var primaryKey = {shardKey: TEST_ID, id: getCount++};
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    row.id = backCount++;
                    assert(err === null, err);
                    var res = test_util.compareRows(result.currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);

                    if (backCount % 10 == 0)
                      console.log(backCount + '..');
                    if (backCount >= totalKeys) {
                      console.log(totalKeys);
                      done();
                    }

                  });
                });
            }
          }
        }
      })

    });

    describe('putIfVersion() test cases', function () {

      it('Simple putIfVersion', function (done) {
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
                  if (err)
                    done(err);
                  else
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      if (err)
                        done(err);
                      else {
                        var res = test_util.compareRows(result.currentRow, row);
                        assert(res === null, 'Error verifying result: ' + res);
                        done();
                      }
                    });
                });
          })
      });

      it('Should fail with null table name', function (done) {
        try {
          store.putIfVersion(null, row, null, writeOptions,
            function (err, result) {
              throw new Error('Put accepts nulls as table name');
            });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter tableName is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with null version', function (done) {
        try {
          store.putIfVersion(TABLE_NAME, row, null, writeOptions,
            function (err, result) {
              throw new Error('Put accepts nulls as table name');
            });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter matchVersion is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion('wrong table', row, response.currentRowVersion,
                writeOptions, function (err) {
                  if (err) {
                    test_util.assertDescriptive(err, 'Can\'t find table',
                      'Should fail with wron table name');
                    done();
                  } else
                    done(new Error('Shoudl throw error a wrong table name'));

                });
          });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'timeout must be >= 0',
                    'Expected: timeout must be >= 0');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should do a simple putIfVersion() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
                  if (err)
                    done(err);
                  else
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      if (err)
                        done(err);
                      else {
                        var res = test_util.compareRows(result.currentRow, row);
                        assert(res === null, 'Error verifying result: ' + res);
                        done();
                      }
                    });
                });
          });
      });

      it('Should do a simple putIfVersion() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var backCount = 0;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');

          var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
          store.get(TABLE_NAME, primaryKey, readOptions,
            function (err, response) {
              if (err)
                done(err);
              else

                store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                  writeOptions, function (err, result) {
                    assert(result !== null,
                      'Error receiving the result, should not be null');
                    var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
                    assert(err === null, err);
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      if (err)
                        assert(err === null, err);
                      else {
                        var res = test_util.compareRows(result.currentRow, row);
                        assert(res === null, 'Error verifying result: ' + res);
                      }
                      if (backCount++ == 9)
                        done();
                    });
                  });
            }); // get
        } // for

      }); // it

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.id = 2147483648;

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'Illegal value for numeric field',
                    'Expected: Illegal value for numeric field');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.l = 123456.123456;

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'Illegal value for numeric field',
                    'Expected: Illegal value for numeric field');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row(TEST_ID);
        row.arrStr = 'hello';

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'Illegal value for field',
                    'Expected: Illegal value for field');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should put with default WriteOptions', function (done) {

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    if (err)
                      done(err);
                    else {
                      var res = test_util.compareRows(result.currentRow, row);
                      assert(res === null, 'Error verifying result: ' + res);
                      done();
                    }
                  });
                });
          }); // get
      });

      it('Should put with WriteOptions.timeout = 0', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 0;

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    if (err)
                      done(err);
                    else {
                      var res = test_util.compareRows(result.currentRow, row);
                      assert(res === null, 'Error verifying result: ' + res);
                      done();
                    }
                  });
                });
          }); // get
      });

      it('Should throw error with null row', function (done) {
        try {
          store.putIfVersion(TABLE_NAME, null, null, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should putIfVersion() with all WriteOptions', function (done) {
        var putCount = TEST_ID, getCount = TEST_ID, backCount = TEST_ID;
        var row = new test_util.Row(TEST_ID);
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        totalKeys += backCount;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);


              row.id = putCount++;

              var primaryKey = {shardKey: TEST_ID, id: row.id};
              store.get(TABLE_NAME, primaryKey, readOptions,
                function (err, response) {
                  if (err)
                    done(err);
                  else

                    store.putIfVersion(TABLE_NAME, row,
                      response.currentRowVersion,
                      writeOptions, function (err, result) {
                        assert(result !== null,
                          'Error receiving the result, should not be null');
                        assert(err === null, err);
                        var primaryKey = {shardKey: TEST_ID, id: getCount++};
                        store.get(TABLE_NAME, primaryKey,
                          function (err, result) {
                            row.id = backCount++;
                            assert(err === null, err);
                            var res = test_util.compareRows(result.currentRow,
                              row);
                            assert(res === null,
                              'Error verifying result: ' + res);

                            if (backCount % 10 == 0)
                              console.log(backCount + '..');
                            if (backCount >= totalKeys) {
                              console.log(totalKeys);
                              done();
                            }

                          }); // get
                      }); // putIfVersion
                }); // get
            }
          }
        }
      })

    })

  });

  describe('put() on child tables test cases', function () {

    var TABLE_NAME = test_util.TABLE_NAME_CHILD;
    var TABLE_DEFINITION = test_util.TABLE_CHILD_DEFINITION;

    var row = new test_util.Row_child(TEST_ID);

    // execute this before all test cases
    before(function (done) {
      console.log('      Verifying table for testing: ' + TABLE_NAME);
      store.execute(
        ' create table ' + TABLE_NAME + TABLE_DEFINITION,
        function (err) {
          if (err) done(); else {
            err = new Error('Testing Error, table or data not available' +
            'for this test, use `mocha -g Setup`');
            done(err);
          }
        }); // execute
    }); // before

    describe('put() test cases', function () {

      it('Should do a simple put()', function (done) {
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          if (err)
            done(err);
          else
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
        });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'timeout must be >= 0',
            'Expected error: timeout must be >= 0');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should do a simple put() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          if (err)
            done(err);
          else
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
        });
      });

      it('Should do a simple put() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var finalErr = null;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');
          store.put(TABLE_NAME, row, writeOptions,
            function (err, result) {
              assert(result !== null,
                'Error receiving the result, should not be null');
              var primaryKey =
              {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
              assert(err === null, err);
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  assert(err === null, err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                }
              });
            });
        }
        done();

      });

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.id_child = 2147483648;
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.l_child = 123456.123456;
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.arrStr_child = 'hello';
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for field',
            'Expected: Illegal value for field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should put() with default WriteOptions', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        store.put(TABLE_NAME, row, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          assert(err === null, err);
          store.get(TABLE_NAME, primaryKey, function (err, result) {
            if (err)
              done(err);
            else {
              var res = test_util.compareRows(result.currentRow, row);
              assert(res === null, 'Error verifying result: ' + res);
              done();
            }
          });
        });
      });

      it('Should put() with WriteOptions.timeout = 0', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 9999;
        store.put(TABLE_NAME, row, writeOptions, done);
      });

      it('Should throw error with null row', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 100;
        var row = null;
        try {
          store.put(TABLE_NAME, row, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should put() with all WriteOptions', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var putCount = 0, backCount = 0;
        var errorFlag = false;
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);
              row.id = putCount++;
              store.put(TABLE_NAME, row, writeOptions,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: row.shardKey, id: row.id, id_child: row.id_child};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    assert(err === null, err);
                    var res = test_util.compareRows(result.currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);
                  });
                });
              ++backCount;
              if (backCount % 10 == 0)
                console.log(backCount + '..');
              if (backCount >= totalKeys) {
                console.log(totalKeys);
                done();
              }
            }
          }
        }
      })

    });

    describe('putIfAbsent() test cases', function () {
      it('Simple putIfAbsent()', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        store.putIfAbsent(TABLE_NAME, row, function (err, result) {
          if (err)
            done(err);
          else {
            assert(result !== null,
              'Error receiving the result, should not be null');
            var primaryKey =
            {shardKey: row.shardKey, id: row.id, id_child: row.id_child};
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
          }
        });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'timeout must be >= 0',
            'Expected error: timeout must be >= 0');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should do a simple putIfAbsent() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        store.putIfAbsent(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          if (err)
            done(err);
          else
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
        });
      });

      it('Should do a simple putIfAbsent() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var finalErr = null;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');
          store.putIfAbsent(TABLE_NAME, row, writeOptions,
            function (err, result) {
              assert(result !== null,
                'Error receiving the result, should not be null');
              var primaryKey =
              {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
              assert(err === null, err);
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  assert(err === null, err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                }
              });
            });
        }
        done();

      });

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.id_child = 2147483648;
        store.putIfAbsent(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.l_child = 123456.123456;
        store.putIfAbsent(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.arrStr_child = 'hello';
        store.putIfAbsent(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for field',
            'Expected: Illegal value for field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should putIfAbsent() with default WriteOptions', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        store.putIfAbsent(TABLE_NAME, row, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          assert(err === null, err);
          store.get(TABLE_NAME, primaryKey, function (err, result) {
            if (err)
              done(err);
            else {
              var res = test_util.compareRows(result.currentRow, row);
              assert(res === null, 'Error verifying result: ' + res);
              done();
            }
          });
        });
      });

      it('Should putIfAbsent() with WriteOptions.timeout = 0', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 9999;
        store.putIfAbsent(TABLE_NAME, row, writeOptions, done);
      });

      it('Should throw error with null row', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 100;
        var row = null;
        try {
          store.putIfAbsent(TABLE_NAME, row, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should putIfAbsent() with all WriteOptions', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var putCount = 0, backCount = 0;
        var errorFlag = false;
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);
              row.id = putCount++;
              store.putIfAbsent(TABLE_NAME, row, writeOptions,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: row.shardKey, id: row.id, id_child: row.id_child};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    assert(err === null, err);
                    var res = test_util.compareRows(result.currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);
                  });
                });
              ++backCount;
              if (backCount % 10 == 0)
                console.log(backCount + '..');
              if (backCount >= totalKeys) {
                console.log(totalKeys);
                done();
              }
            }
          }
        }
      })

    });

    describe('putIfPresent() test cases', function () {
      it('Simple putIfPresent()', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var writeOptions = new types.WriteOptions(durability, 1000);
        store.putIfPresent(TABLE_NAME, row, writeOptions,
          function (err, result) {
            if (err)
              done(err);
            else {
              assert(result !== null,
                'Error receiving the result, should not be null');
              var primaryKey =
              {shardKey: row.shardKey, id: row.id, id_child: row.id_child};
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  done(err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  done();
                }
              });
            }
          });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        store.put(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'timeout must be >= 0',
            'Expected error: timeout must be >= 0');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should do a simple putIfPresent() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        store.putIfPresent(TABLE_NAME, row, writeOptions, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          if (err)
            done(err);
          else
            store.get(TABLE_NAME, primaryKey, function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(result.currentRow, row);
                assert(res === null, 'Error verifying result: ' + res);
                done();
              }
            });
        });
      });

      it('Should do a simple putIfPresent() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var finalErr = null;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');
          store.putIfPresent(TABLE_NAME, row, writeOptions,
            function (err, result) {
              assert(result !== null,
                'Error receiving the result, should not be null');
              var primaryKey =
              {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
              assert(err === null, err);
              store.get(TABLE_NAME, primaryKey, function (err, result) {
                if (err)
                  assert(err === null, err);
                else {
                  var res = test_util.compareRows(result.currentRow, row);
                  assert(res === null, 'Error verifying result: ' + res);
                }
              });
            });
        }
        done();

      });

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.id_child = 2147483648;
        store.putIfPresent(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.l_child = 123456.123456;
        store.putIfPresent(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for numeric field',
            'Expected: Illegal value for numeric field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.arrStr_child = 'hello';
        store.putIfPresent(TABLE_NAME, row, writeOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Illegal value for field',
            'Expected: Illegal value for field');
          assert(result === undefined, 'No result expected');
          done();
        });
      });

      it('Should putIfPresent() with default WriteOptions', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        store.putIfPresent(TABLE_NAME, row, function (err, result) {
          assert(result !== null,
            'Error receiving the result, should not be null');
          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID };
          assert(err === null, err);
          store.get(TABLE_NAME, primaryKey, function (err, result) {
            if (err)
              done(err);
            else {
              var res = test_util.compareRows(result.currentRow, row);
              assert(res === null, 'Error verifying result: ' + res);
              done();
            }
          });
        });
      });

      it('Should putIfPresent() with WriteOptions.timeout = 0', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 9999;
        store.putIfPresent(TABLE_NAME, row, writeOptions, done);
      });

      it('Should throw error with null row', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 100;
        var row = null;
        try {
          store.putIfPresent(TABLE_NAME, row, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should putIfPresent() with all WriteOptions', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var putCount = 0, backCount = 0;
        var errorFlag = false;
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);
              row.id = putCount++;
              store.putIfPresent(TABLE_NAME, row, writeOptions,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: row.shardKey, id: row.id, id_child: row.id_child};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    assert(err === null, err);
                    var res = test_util.compareRows(result.currentRow, row);
                    assert(res === null, 'Error verifying result: ' + res);
                  });
                });
              ++backCount;
              if (backCount % 10 == 0)
                console.log(backCount + '..');
              if (backCount >= totalKeys) {
                console.log(totalKeys);
                done();
              }
            }
          }
        }
      })

    });

    describe('putIfVersion() test cases', function () {
      it('Simple putIfVersion', function (done) {
        var row = new test_util.Row_child(TEST_ID);
        var primaryKey = {shardKey: 0, id: 0, id_child: 0};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: row.shardKey, id: row.id, id_child: row.id_child};
                  if (err)
                    done(err);
                  else
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      if (err)
                        done(err);
                      else {
                        var res = test_util.compareRows(result.currentRow, row);
                        assert(res === null, 'Error verifying result: ' + res);
                        done();
                      }
                    });
                });
          })
      });

      it('Should fail with null table name', function (done) {
        try {
          store.putIfVersion(null, row, null, writeOptions,
            function (err, result) {
              throw new Error('Put accepts nulls as table name');
            });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter tableName is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with null version', function (done) {
        try {
          store.putIfVersion(TABLE_NAME, row, null, writeOptions,
            function (err, result) {
              throw new Error('Put accepts nulls as table name');
            });
        } catch (err) {
          test_util.assertDescriptive(err,
            'The parameter matchVersion is missing',
            'Should fail with tableName=null');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion('wrong table', row, response.currentRowVersion,
                writeOptions, function (err) {
                  if (err) {
                    test_util.assertDescriptive(err, 'Can\'t find table',
                      'Should fail with wron table name');
                    done();
                  } else
                    done(new Error('Shoudl throw error a wrong table name'));

                });
          });
      });

      it('Should fail with negative timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, -1000);
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'timeout must be >= 0',
                    'Expected: timeout must be >= 0');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should do a simple putIfVersion() - zero timeout', function (done) {
        var writeOptions = new types.WriteOptions(durability, 0);
        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else
              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
                  if (err)
                    done(err);
                  else
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      if (err)
                        done(err);
                      else {
                        var res = test_util.compareRows(result.currentRow, row);
                        assert(res === null, 'Error verifying result: ' + res);
                        done();
                      }
                    });
                });
          });
      });

      it('Should do a simple putIfVersion() with random timeouts', function (done) {
        console.log('          Timeouts: ');
        var backCount = 0;
        for (var i = 0; i < 10; i++) {
          var timeout = Math.floor(Math.random() * 10000);
          var writeOptions = new types.WriteOptions(durability, timeout);
          console.log(timeout + '  ');

          var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
          store.get(TABLE_NAME, primaryKey, readOptions,
            function (err, response) {
              if (err)
                done(err);
              else

                store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                  writeOptions, function (err, result) {
                    assert(result !== null,
                      'Error receiving the result, should not be null');
                    var primaryKey =
                    {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
                    assert(err === null, err);
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      if (err)
                        assert(err === null, err);
                      else {
                        var res = test_util.compareRows(result.currentRow, row);
                        assert(res === null, 'Error verifying result: ' + res);
                      }
                      if (backCount++ == 9)
                        done();
                    });
                  });
            }); // get
        } // for

      }); // it

      it('Should throw error sending long to int field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.id_child = 2147483648;

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'Illegal value for numeric field',
                    'Expected: Illegal value for numeric field');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should throw error sending double to long field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.l_child = 123456.123456;

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'Illegal value for numeric field',
                    'Expected: Illegal value for numeric field');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should throw error sending string to array field', function (done) {
        var writeOptions = new types.WriteOptions(durability, 1000);
        var row = new test_util.Row_child(TEST_ID);
        row.arrStr_child = 'hello';

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  test_util.assertDescriptive(err, 'Illegal value for field',
                    'Expected: Illegal value for field');
                  assert(result === undefined, 'No result expected');
                  done();
                });
          });
      });

      it('Should put with default WriteOptions', function (done) {

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    if (err)
                      done(err);
                    else {
                      var res = test_util.compareRows(result.currentRow, row);
                      assert(res === null, 'Error verifying result: ' + res);
                      done();
                    }
                  });
                });
          }); // get
      });

      it('Should put with WriteOptions.timeout = 0', function (done) {
        var writeOptions = new types.WriteOptions();
        writeOptions.timeout = 0;

        var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, response) {
            if (err)
              done(err);
            else

              store.putIfVersion(TABLE_NAME, row, response.currentRowVersion,
                writeOptions, function (err, result) {
                  assert(result !== null,
                    'Error receiving the result, should not be null');
                  var primaryKey =
                  {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
                  assert(err === null, err);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    if (err)
                      done(err);
                    else {
                      var res = test_util.compareRows(result.currentRow, row);
                      assert(res === null, 'Error verifying result: ' + res);
                      done();
                    }
                  });
                });
          }); // get
      });

      it('Should throw error with null row', function (done) {
        try {
          store.putIfVersion(TABLE_NAME, null, null, writeOptions);
        } catch (err) {
          assert.throws(function () {
            throw err
          }, function () {
            if ((err instanceof Error) && err.message) {
              return true;
            }
          });
          done();
        }
      });

      it('Should putIfVersion() with all WriteOptions', function (done) {
        var putCount = TEST_ID, getCount = TEST_ID, backCount = TEST_ID;
        var row = new test_util.Row_child(TEST_ID);
        console.log('          All WriteOptions tests: ');
        var totalKeys =
          Object.keys(types.SyncPolicy).length *
          Object.keys(types.ReplicaAckPolicy).length *
          Object.keys(types.SyncPolicy).length;
        totalKeys += backCount;
        for (var masterSync_KEY in types.SyncPolicy) {
          for (var replicaAck_KEY in types.ReplicaAckPolicy) {
            for (var replicaSync_KEY in types.SyncPolicy) {
              var iDurability =
                new types.Durability(
                  types.SyncPolicy[masterSync_KEY],
                  types.ReplicaAckPolicy[replicaAck_KEY],
                  types.SyncPolicy[replicaSync_KEY]);
              var writeOptions =
                new types.WriteOptions(iDurability, 1000);


              row.id_child = putCount++;

              var primaryKey = {shardKey: TEST_ID, id: TEST_ID,
                id_child:row.id_child};
              store.get(TABLE_NAME, primaryKey, readOptions,
                function (err, response) {
                  if (err)
                    done(err);
                  else

                    store.putIfVersion(TABLE_NAME, row,
                      response.currentRowVersion,
                      writeOptions, function (err, result) {
                        assert(result !== null,
                          'Error receiving the result, should not be null');
                        assert(err === null, err);
                        var primaryKey = {shardKey: TEST_ID, id: TEST_ID,
                          id_child: getCount++};
                        store.get(TABLE_NAME, primaryKey,
                          function (err, result) {
                            row.id_child = backCount++;
                            assert(err === null, err);
                            var res = test_util.compareRows(result.currentRow,
                              row);
                            assert(res === null,
                              'Error verifying result: ' + res);

                            if (backCount % 10 == 0)
                              console.log(backCount + '..');
                            if (backCount >= totalKeys) {
                              console.log(totalKeys);
                              done();
                            }

                          }); // get
                      }); // putIfVersion
                }); // get
            }
          }
        }
      })

    })

  });

});
