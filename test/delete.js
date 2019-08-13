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
var ttypes = require('../lib/thrift/ondb_types');

describe('Oracle NoSQLDB - delete() test cases', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');


  var durability =
    new types.Durability(
      types.SyncPolicy.NO_SYNC,
      types.ReplicaAckPolicy.SIMPLE_MAJORITY,
      types.SyncPolicy.NO_SYNC);
  var writeOptions =
    new types.WriteOptions(durability, 1000, types.ReturnChoice.ALL);

  // Preparing store
  var store = client.createStore(configuration);

  var TABLE_NAME = test_util.TABLE_NAME;

  var TEST_ID = 1;
  var primaryKey = {shardKey: TEST_ID, id: TEST_ID};
  var row = new test_util.Row(TEST_ID);

  // execute this before all test cases
  before(function (done) {
    this.timeout(10000);
    test_util.checkSetup(store, done);
  }); // before
  after(function(done) {
    store.close(done);
  });

  describe('delete()', function () {

    it('Should delete()', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should fail with null table name ', function (done) {
      try {
        store.delete(null, primaryKey, writeOptions, function () {
          throw new Error('No answer expected.');
        });
      } catch (error) {
        test_util.assertDescriptive(error, 'The parameter tableName is missing',
          'Error expected');
        done();
      }
    });

    it('Should fail with wrong table name', function (done) {
      store.delete('wrong', primaryKey, writeOptions, function (err, result) {
        test_util.assertDescriptive(err, 'Can\'t find table',
          'Error expected');
        assert(result==null, 'Result should be null');
        done();
      });
    });

    it('Should delete() without writeOptions', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
      });
    }); // it

    it('Should ignore extra elements from a primary key', function (done) {
      row.id = TEST_ID;
      var primaryKey = {shardKey: TEST_ID, id: TEST_ID, indexKey1: TEST_ID};
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted, 'Should be deleted');
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      }); // put
    }); // it

    it('Should delete() with all WriteOptions', function (done) {
      var row = new test_util.Row(TEST_ID);
      var putCount = 0, deleteCount = 0, getCount = 0, backCount = 0;
      console.log('        All WriteOptions tests: ');
      var totalKeys =
        Object.keys(types.SyncPolicy).length *
        Object.keys(types.ReplicaAckPolicy).length *
        Object.keys(types.SyncPolicy).length;
      for (var masterSync_KEY in types.SyncPolicy)
        for (var replicaAck_KEY in types.ReplicaAckPolicy)
          for (var replicaSync_KEY in types.SyncPolicy) {
            var iDurability = new types.Durability(
                types.SyncPolicy[masterSync_KEY],
                types.ReplicaAckPolicy[replicaAck_KEY],
                types.SyncPolicy[replicaSync_KEY]);

            var writeOptions = new types.WriteOptions(iDurability, 1000);
            row.id = putCount++;
            store.put(TABLE_NAME, row, writeOptions,
              function (err, result) {
                assert(err === null, err);
                assert(result !== null,
                  'Error receiving the result, should not be null');
                var primaryKey = {shardKey: TEST_ID, id: deleteCount++};
                store.delete(TABLE_NAME, primaryKey, writeOptions,
                  function (err, result) {
                    if (err)
                      assert(err === null, err);
                    else {
                     assert.equal(true, result.wasDeleted);
                      var primaryKey = {shardKey: TEST_ID, id: getCount++};
                      store.get(TABLE_NAME, primaryKey,
                        function (err, result) {
                          assert(result.currentRow === null,
                            'Error deleting, row still exists.');
                      }); // get
                      ++backCount;
                      if (backCount % 10 == 0)
                        console.log(backCount);
                      if (backCount >= totalKeys) {
                        console.log(totalKeys);
                        done();
                      }
                    }
                  }); // delete
              });
        }
    }); // it

    it('Should delete() with returnChoice = ALL', function (done) {
      row.id = TEST_ID;
      row.ttl = new Types.TimeToLive(42, Types.TimeUnit.HOURS);
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.ALL;
      writeOptions.updateTTL = true;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(row, result.previousRow);
                assert(res === null, 'Error verifying deleted row: ' + res);
                assert(result.previousRowVersion !== null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' contain a value');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      });

    }); // it

    it('Should delete() with returnChoice = NONE', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.NONE;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should delete() with returnChoice = VALUE', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;

      var writeOptions =
        new types.WriteOptions(durability, 1000, types.ReturnChoice.VALUE);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(row, result.previousRow);
                assert(res === null, 'Error verifying deleted row: ' + res);
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should delete() with returnChoice = VERSION', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.VERSION;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion !== null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' not be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

  });  // describe

  describe('deleteIfVersion()', function () {

    it('Should deleteIfVersion()', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
      });
    }); // it

    it('Should not deleteIfVersion() with wrong version', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          var oldVersion = result.currentRowVersion;
          store.put(TABLE_NAME, row, function (err, result) {
            if (err)
              done(err);
            else {
              store.deleteIfVersion(TABLE_NAME, primaryKey,
                oldVersion, writeOptions, function (err, result) {
                  if (err)
                    done(err);
                  else
                    assert.equal(false, result.wasDeleted);
                    store.get(TABLE_NAME, primaryKey, function (err, result) {
                      assert(result.currentRow !== null,
                        'Error deleting, row not exists.');
                      done();
                    });
                }); // deleteIfVersion
            }
          }); // put
        }
      }); // put
    }); // it

    it('Should fail with null table name ', function (done) {
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          try {
            store.deleteIfVersion(null, primaryKey, result.currentRowVersion,
              writeOptions, function () {
                throw new Error('No answer expected.');
              });
          } catch (error) {
            test_util.assertDescriptive(error,
              'The parameter tableName is missing',
              'Error expected');
            done();
          }
        }
      });
    });

    it('Should fail with wrong table name', function (done) {
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion('wrong', primaryKey, result.currentRowVersion,
            writeOptions, function (err, result) {
              test_util.assertDescriptive(err, 'Can\'t find table',
                'Error expected');
              assert(result == null, 'Result should be null');
              done();
            });
      });// put
    });//it

    it('Should deleteIfVersion() without writeOptions', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });

      });
    }); // it

    it('Should ignore extra elements from a primary key', function (done) {
      row.id = TEST_ID;
      var primaryKey = {shardKey: TEST_ID, id: TEST_ID, indexKey1: TEST_ID};
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted, 'Should be deleted');
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      }); // put
    }); // it

    it('Should deleteIfVersion() with all WriteOptions', function (done) {
      var row = new test_util.Row(TEST_ID);
      var putCount = 0, deleteCount = 0, getCount = 0, backCount = 0;
      console.log('        All WriteOptions tests: ');
      var totalKeys =
        Object.keys(types.SyncPolicy).length *
        Object.keys(types.ReplicaAckPolicy).length *
        Object.keys(types.SyncPolicy).length;
      for (var masterSync_KEY in types.SyncPolicy)
        for (var replicaAck_KEY in types.ReplicaAckPolicy)
          for (var replicaSync_KEY in types.SyncPolicy) {
            var iDurability = new types.Durability(
              types.SyncPolicy[masterSync_KEY],
              types.ReplicaAckPolicy[replicaAck_KEY],
              types.SyncPolicy[replicaSync_KEY]);

            var writeOptions = new types.WriteOptions(iDurability, 1000);
            row.id = putCount++;
            store.put(TABLE_NAME, row, writeOptions,
              function (err, result) {
                assert(err === null, err);
                assert(result !== null,
                  'Error receiving the result, should not be null');
                var primaryKey = {shardKey: TEST_ID, id: deleteCount++};
                store.deleteIfVersion(TABLE_NAME, primaryKey,
                  result.currentRowVersion, writeOptions,
                  function (err, result) {
                    if (err)
                      assert(err === null, err);
                    else {
                      assert.equal(true, result.wasDeleted,
                        'Result of deleteIfVersion() is expected.');
                      var primaryKey = {shardKey: TEST_ID, id: getCount++};
                      store.get(TABLE_NAME, primaryKey,
                        function (err, result) {
                          assert(result.currentRow === null,
                            'Error deleting, row still exists.');
                        }); // get
                      ++backCount;
                      if (backCount % 10 == 0)
                        console.log(backCount);
                      if (backCount >= totalKeys) {
                        console.log(totalKeys);
                        done();
                      }
                    }
                  }); // delete
              });
          }
    }); // it

    it('Should deleteIfVersion() with returnChoice = ALL', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.ALL;
      store.put(TABLE_NAME, row, writeOptions, function (err, result) {
        if (err)
          done(err);
        else {
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            }); // deleteIfVersion
        }
      });

    }); // it

    it('Should deleteIfVersion() with returnChoice = NONE', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.NONE;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should deleteIfVersion() with returnChoice = VALUE', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.VALUE;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should deleteIfVersion() with returnChoice = VERSION', function (done) {
      row.id = TEST_ID;
      primaryKey.id = TEST_ID;
      writeOptions.returnChoice = types.ReturnChoice.VERSION;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

  });  // describe

  describe('multiDelete()', function () {

    this.timeout(5000); // this tests may take some time

    it('Should multiDelete()', function (done) {
      var TOTAL_ROWS = 100;
      var primaryKey = {shardKey: TEST_ID};
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err) {
          assert(err == null, 'Error inserting required data');
        });
      }
      store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
        function (err, result) {
          if (err)
            done(err);
          else {
            assert(result === TOTAL_ROWS, 'Rows inserted were not deleted');
            store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
              assert(result.returnRows.length === 0,
                'Error deleting, row still exists.');
              done();
            });
          }
        }); // multiDelete;
    }); // it

    it('Should multiDelete() with random timeout', function (done) {
      var TOTAL_ROWS = 100;
      var backCount = 1;
      var TOTAL_TESTS = 10;
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err, result) {
          assert(err == null, 'Error inserting required data');
        });
      }
      console.log('        Random timeouts: ');
      for (var count=0; count < TOTAL_TESTS; count++) {
        writeOptions.timeoutMs = Math.floor(Math.random() * 10000);
        console.log(writeOptions.timeoutMs);
        var primaryKey = {shardKey: TEST_ID, id: count};
        store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
          function (err, result) {
            if (err)
              done(err);
            else {
              assert(result === 1, 'Rows inserted were not deleted');
              store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
                assert(result.returnRows.length === 0,
                  'Error deleting, row still exists.');
                if (backCount++ >= TOTAL_TESTS) {
                  done();
                }
              });
            }
          }); // multiDelete;
      } // for
    }); // it

    it('Should fail with null table name ', function (done) {
        try {
          store.multiDelete(null, primaryKey,
            writeOptions, function () {
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
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.multiDelete('wrong', primaryKey, writeOptions,
            function (err, result) {
              test_util.assertDescriptive(err, 'Can\'t find table',
                'Error expected');
              assert(result == null, 'Result should be null');
              done();
            });
      });// put
    });//it

    it('Should multiDelete() without writeOptions', function (done) {
      var TOTAL_ROWS = 100;
      var primaryKey = {shardKey: TEST_ID};
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err, result) {
          assert(err == null, 'Error inserting required data');
        });
      }
      store.multiDelete(TABLE_NAME, primaryKey,
        function (err, result) {
          if (err)
            done(err);
          else {
            assert(result === TOTAL_ROWS, 'Rows inserted were not deleted');
            store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
              assert(result.returnRows.length === 0,
                'Error deleting, row still exists.');
              done();
            });
          }
        }); // multiDelete;
    }); // it

    it('Should ignore extra elements from a primary key', function (done) {
      row.id = TEST_ID;
      var primaryKey = {shardKey: TEST_ID, id: TEST_ID, indexKey1: TEST_ID};
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert(result>0, 'multiDelete result is expected.');
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      }); // put
    }); // it

    it('Should multiDelete() with all WriteOptions', function (done) {
      var row = new test_util.Row(TEST_ID);
      var putCount = 0, deleteCount = 0, getCount = 0, backCount = 0;
      console.log('        All WriteOptions tests: ');
      var totalKeys =
        Object.keys(types.SyncPolicy).length *
        Object.keys(types.ReplicaAckPolicy).length *
        Object.keys(types.SyncPolicy).length;
      for (var masterSync_KEY in types.SyncPolicy)
        for (var replicaAck_KEY in types.ReplicaAckPolicy)
          for (var replicaSync_KEY in types.SyncPolicy) {
            var iDurability = new types.Durability(
              types.SyncPolicy[masterSync_KEY],
              types.ReplicaAckPolicy[replicaAck_KEY],
              types.SyncPolicy[replicaSync_KEY]);

            var writeOptions = new types.WriteOptions(iDurability, 1000);
            row.id = putCount++;
            store.put(TABLE_NAME, row, writeOptions,
              function (err, result) {
                assert(err === null, err);
                assert(result !== null,
                  'Error receiving the result, should not be null');
                var primaryKey = {shardKey: TEST_ID, id: deleteCount++};
                store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
                  function (err, result) {
                    if (err)
                      assert(err === null, err);
                    else {
                      assert(result>0, 'multiDelete result is expected.');
                      var primaryKey = {shardKey: TEST_ID, id: getCount++};
                      store.get(TABLE_NAME, primaryKey,
                        function (err, result) {
                          assert(result.currentRow === null,
                            'Error deleting, row still exists.');
                        }); // get
                      ++backCount;
                      if (backCount % 10 == 0)
                        console.log(backCount);
                      if (backCount >= totalKeys) {
                        console.log(totalKeys);
                        done();
                      }
                    }
                  }); // delete
              });
          }
    }); // it

  });  // describe

  // Child Tables

  describe('delete() in child tables', function () {

    var TABLE_NAME = test_util.TABLE_NAME_CHILD;
    var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
    var row = new test_util.Row_child(TEST_ID);

    it('Should delete()', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should delete() without writeOptions', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
      });
    }); // it

    it('Should ignore extra elements from a primary key', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      var primaryKey =
      {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID, indexKey1: TEST_ID};
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted, 'Should be deleted');
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      }); // put
    }); // it

    it('Should delete() with all WriteOptions', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      var putCount = 0, deleteCount = 0, getCount = 0, backCount = 0;
      console.log('        All WriteOptions tests: ');
      var totalKeys =
        Object.keys(types.SyncPolicy).length *
        Object.keys(types.ReplicaAckPolicy).length *
        Object.keys(types.SyncPolicy).length;
      for (var masterSync_KEY in types.SyncPolicy)
        for (var replicaAck_KEY in types.ReplicaAckPolicy)
          for (var replicaSync_KEY in types.SyncPolicy) {
            var iDurability = new types.Durability(
              types.SyncPolicy[masterSync_KEY],
              types.ReplicaAckPolicy[replicaAck_KEY],
              types.SyncPolicy[replicaSync_KEY]);

            var writeOptions = new types.WriteOptions(iDurability, 1000);
            row.id_child = putCount++;
            store.put(TABLE_NAME, row, writeOptions,
              function (err, result) {
                assert(err === null, err);
                assert(result !== null,
                  'Error receiving the result, should not be null');
                var primaryKey = {shardKey: TEST_ID, id: TEST_ID,
                  id_child: deleteCount++};
                store.delete(TABLE_NAME, primaryKey, writeOptions,
                  function (err, result) {
                    if (err)
                      assert(err === null, err);
                    else {
                      assert.equal(true, result.wasDeleted);
                      var primaryKey = {shardKey: TEST_ID, id: TEST_ID,
                        id_child: getCount++};
                      store.get(TABLE_NAME, primaryKey,
                        function (err, result) {
                          assert(result.currentRow === null,
                            'Error deleting, row still exists.');
                        }); // get
                      ++backCount;
                      if (backCount % 10 == 0)
                        console.log(backCount);
                      if (backCount >= totalKeys) {
                        console.log(totalKeys);
                        done();
                      }
                    }
                  }); // delete
              });
          }
    }); // it

    it('Should delete() with returnChoice = ALL', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.ALL;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(row, result.previousRow);
                assert(res === null, 'Error verifying deleted row: ' + res);
                assert(result.previousRowVersion !== null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' contain a value');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      });

    }); // it

    it('Should delete() with returnChoice = NONE', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.NONE;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should delete() with returnChoice = VALUE', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      var writeOptions =
        new types.WriteOptions(durability, 1000, types.ReturnChoice.VALUE);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                var res = test_util.compareRows(row, result.previousRow);
                assert(res === null, 'Error verifying deleted row: ' + res);
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should delete() with returnChoice = VERSION', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.VERSION;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.delete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion !== null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' not be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

  });  // describe

  describe('deleteIfVersion() in child tables', function () {
    var TABLE_NAME = test_util.TABLE_NAME_CHILD;
    var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
    var row = new test_util.Row_child(TEST_ID);

    it('Should deleteIfVersion()', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
      });
    }); // it

    it('Should not deleteIfVersion() with wrong version', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          var oldVersion = result.currentRowVersion;
          store.put(TABLE_NAME, row, function (err, result) {
            if (err)
              done(err);
            else {
              store.deleteIfVersion(TABLE_NAME, primaryKey,
                oldVersion, writeOptions, function (err, result) {
                  if (err)
                    done(err);
                  else
                    assert.equal(false, result.wasDeleted);
                  store.get(TABLE_NAME, primaryKey, function (err, result) {
                    assert(result.currentRow !== null,
                      'Error deleting, row not exists.');
                    done();
                  });
                }); // deleteIfVersion
            }
          }); // put
        }
      }); // put
    }); // it

    it('Should deleteIfVersion() without writeOptions', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });

      });
    }); // it

    it('Should ignore extra elements from a primary key', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      var primaryKey =
      {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID, indexKey1: TEST_ID};
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.equal(true, result.wasDeleted, 'Should be deleted');
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      }); // put
    }); // it

    it('Should deleteIfVersion() with all WriteOptions', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      var putCount = 0, deleteCount = 0, getCount = 0, backCount = 0;
      console.log('        All WriteOptions tests: ');
      var totalKeys =
        Object.keys(types.SyncPolicy).length *
        Object.keys(types.ReplicaAckPolicy).length *
        Object.keys(types.SyncPolicy).length;
      for (var masterSync_KEY in types.SyncPolicy)
        for (var replicaAck_KEY in types.ReplicaAckPolicy)
          for (var replicaSync_KEY in types.SyncPolicy) {
            var iDurability = new types.Durability(
              types.SyncPolicy[masterSync_KEY],
              types.ReplicaAckPolicy[replicaAck_KEY],
              types.SyncPolicy[replicaSync_KEY]);

            var writeOptions = new types.WriteOptions(iDurability, 1000);
            row.id_child = putCount++;
            store.put(TABLE_NAME, row, writeOptions,
              function (err, result) {
                assert(err === null, err);
                assert(result !== null,
                  'Error receiving the result, should not be null');
                var primaryKey =
                {shardKey: TEST_ID, id: TEST_ID, id_child: deleteCount++};

                store.deleteIfVersion(TABLE_NAME, primaryKey,
                  result.currentRowVersion, writeOptions,
                  function (err, result) {
                    if (err)
                      assert(err === null, err);
                    else {
                      assert.equal(true, result.wasDeleted,
                        'Result of deleteIfVersion() is expected.');
                      var primaryKey =
                      {shardKey: TEST_ID, id: TEST_ID, id_child: getCount++};
                      store.get(TABLE_NAME, primaryKey,
                        function (err, result) {
                          assert(result.currentRow === null,
                            'Error deleting, row still exists.');
                        }); // get
                      ++backCount;
                      if (backCount % 10 == 0)
                        console.log(backCount);
                      if (backCount >= totalKeys) {
                        console.log(totalKeys);
                        done();
                      }
                    }
                  }); // delete
              });
          }
    }); // it

    it('Should deleteIfVersion() with returnChoice = ALL', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.ALL;
      store.put(TABLE_NAME, row, writeOptions, function (err, result) {
        if (err)
          done(err);
        else {
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            }); // deleteIfVersion
        }
      });

    }); // it

    it('Should deleteIfVersion() with returnChoice = NONE', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.NONE;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should deleteIfVersion() with returnChoice = VALUE', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.VALUE;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

    it('Should deleteIfVersion() with returnChoice = VERSION', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      writeOptions.returnChoice = types.ReturnChoice.VERSION;
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else
          store.deleteIfVersion(TABLE_NAME, primaryKey,
            result.currentRowVersion, writeOptions, function (err, result) {
              if (err)
                done(err);
              else {
                assert.deepEqual(result.previousRow, {},
                  'Error verifying deleted row: previousRow should be null');
                assert(result.previousRowVersion === null,
                  'Error verifying deleted row: previousRowVersion should ' +
                  ' be null');
                assert.equal(true, result.wasDeleted);
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });

              }
            });
      });
    }); // it

  });  // describe

  describe('multiDelete() in child tables', function () {
    var TABLE_NAME = test_util.TABLE_NAME_CHILD;
    var primaryKey = {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID};
    var row = new test_util.Row_child(TEST_ID);

    this.timeout(5000); // this tests may take some time

    it('Should multiDelete()', function (done) {
      var TOTAL_ROWS = 100;
      var primaryKey = {shardKey: TEST_ID};
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err, result) {
          assert(err == null, 'Error inserting required data');
        });
      }
      store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
        function (err, result) {
          if (err)
            done(err);
          else {
            store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
              assert(result.returnRows.length === 0,
                'Error deleting, row still exists.');
              done();
            });
          }
        }); // multiDelete;
    }); // it

    it('Should multiDelete() with random timeout', function (done) {
      var TOTAL_ROWS = 100;
      var backCount = 1;
      var TOTAL_TESTS = 10;
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err, result) {
          assert(err == null, 'Error inserting required data');
        });
      }
      console.log('        Random timeouts: ');
      for (var count=0; count < TOTAL_TESTS; count++) {
        writeOptions.timeoutMs = Math.floor(Math.random() * 10000);
        console.log(writeOptions.timeoutMs);
        var primaryKey = {shardKey: TEST_ID, id: count};
        store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
          function (err, result) {
            if (err)
              done(err);
            else {
              assert(result === 1, 'Rows inserted were not deleted');
              store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
                assert(result.returnRows.length === 0,
                  'Error deleting, row still exists.');
                if (backCount++ >= TOTAL_TESTS) {
                  done();
                }
              });
            }
          }); // multiDelete;
      } // for
    }); // it

    it('Should multiDelete() with random timeout', function (done) {
      var TOTAL_ROWS = 100;
      var backCount = 1;
      var TOTAL_TESTS = 10;
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err, result) {
          assert(err == null, 'Error inserting required data');
        });
      }
      console.log('        Random timeouts: ');
      for (var count=0; count < TOTAL_TESTS; count++) {
        writeOptions.timeoutMs = Math.floor(Math.random() * 10000);
        console.log(writeOptions.timeoutMs);
        var primaryKey = {shardKey: TEST_ID, id: count};
        store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
          function (err, result) {
            if (err)
              done(err);
            else {
              assert(result === 1, 'Rows inserted were not deleted');
              store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
                assert(result.returnRows.length === 0,
                  'Error deleting, row still exists.');
                if (backCount++ >= TOTAL_TESTS) {
                  done();
                }
              });
            }
          }); // multiDelete;
      } // for
    }); // it

    it('Should multiDelete() without writeOptions', function (done) {
      var TOTAL_ROWS = 100;
      var primaryKey = {shardKey: TEST_ID};
      for (var id = 0; id<TOTAL_ROWS; id++) {
        row.id = id;
        store.put(TABLE_NAME, row, function (err, result) {
          assert(err == null, 'Error inserting required data');
        });
      }
      store.multiDelete(TABLE_NAME, primaryKey,
        function (err, result) {
          if (err)
            done(err);
          else {
            assert(result === TOTAL_ROWS, 'Rows inserted were not deleted');
            store.multiGet(TABLE_NAME, primaryKey, function (err, result) {
              assert(result.returnRows.length === 0,
                'Error deleting, row still exists.');
              done();
            });
          }
        }); // multiDelete;
    }); // it

    it('Should ignore extra elements from a primary key', function (done) {
      row.id = TEST_ID;
      var primaryKey =
      {shardKey: TEST_ID, id: TEST_ID, id_child: TEST_ID, indexKey1: TEST_ID};
      store.put(TABLE_NAME, row, function (err, result) {
        if (err)
          done(err);
        else {
          store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert(result>0, 'multiDelete result is expected.');
                store.get(TABLE_NAME, primaryKey, function (err, result) {
                  assert(result.currentRow === null,
                    'Error deleting, row still exists.');
                  done();
                });
              }
            });
        }
      }); // put
    }); // it

    it('Should multiDelete() with all WriteOptions', function (done) {
      var row = new test_util.Row_child(TEST_ID);
      var putCount = 0, deleteCount = 0, getCount = 0, backCount = 0;
      console.log('        All WriteOptions tests: ');
      var totalKeys =
        Object.keys(types.SyncPolicy).length *
        Object.keys(types.ReplicaAckPolicy).length *
        Object.keys(types.SyncPolicy).length;
      for (var masterSync_KEY in types.SyncPolicy)
        for (var replicaAck_KEY in types.ReplicaAckPolicy)
          for (var replicaSync_KEY in types.SyncPolicy) {
            var iDurability = new types.Durability(
              types.SyncPolicy[masterSync_KEY],
              types.ReplicaAckPolicy[replicaAck_KEY],
              types.SyncPolicy[replicaSync_KEY]);

            var writeOptions = new types.WriteOptions(iDurability, 1000);
            row.id_child = putCount++;
            store.put(TABLE_NAME, row, writeOptions,
              function (err, result) {
                assert(err === null, err);
                assert(result !== null,
                  'Error receiving the result, should not be null');
                var primaryKey =
                {shardKey: TEST_ID, id: TEST_ID, id_child: deleteCount++};
                store.multiDelete(TABLE_NAME, primaryKey, writeOptions,
                  function (err, result) {
                    if (err)
                      assert(err === null, err);
                    else {
                      assert(result>0, 'multiDelete result is expected.');
                      var primaryKey =
                      {shardKey: TEST_ID, id: TEST_ID, id_child:getCount++};
                      store.get(TABLE_NAME, primaryKey,
                        function (err, result) {
                          assert(result.currentRow === null,
                            'Error deleting, row still exists.');
                        }); // get
                      ++backCount;
                      if (backCount % 10 == 0)
                        console.log(backCount);
                      if (backCount >= totalKeys) {
                        console.log(totalKeys);
                        done();
                      }
                    }
                  }); // delete
              });
          }
    }); // it

  });  // describe

});
