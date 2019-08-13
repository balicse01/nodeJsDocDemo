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
 * You Should have received a copy of the GNU Affero General Public License
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

/*global it*/
/*global describe*/
/*global before*/
/*global Errors*/

var fs = require('fs');
var assert = require('assert');
var client = require('../nosqldb');
var types = client.Types;
var errors = client.Errors;
var test_util = require('./util');

describe('Oracle NoSQLDB', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  var TEST_ID = 7;
  var row = new test_util.Row(TEST_ID);

  var durability =
    new types.Durability(types.SyncPolicy.NO_SYNC,
      types.ReplicaAckPolicy.SIMPLE_MAJORITY,
      types.SyncPolicy.NO_SYNC);
  var writeOptions = new types.WriteOptions(durability, 1000);
  writeOptions.updateTTL = true;
  // Preparing store
  var store = client.createStore(configuration);

  var TABLE_NAME = test_util.TABLE_NAME;

  // execute() this before all test cases
  before(function (done) {
    this.timeout(10000);
    test_util.checkSetup(store, done);
  }); // before
  after(function(done) {
    store.close(done);
  });

  this.timeout(20000);
  describe('execute()', function () {

    it('Should execute() Statement DROP', function (done) {
      store.execute(' DROP TABLE IF EXISTS ' + TABLE_NAME + '_1 ', done);
    });

    it('Should execute() Statement CREATE', function (done) {
      store.execute(
        ' CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + '_1 ' +
        ' ( id LONG, age INTEGER, name STRING, PRIMARY KEY(id) ) ',
        function (err, result) {
          if (err)
            done(err);
          else {
            assert(result != null, 'Result expected');
            done();
          }
        }
      );
    });

    it('Should fail execute() Statement: CREATE', function (done) {
      store.execute(
        ' CREATE TABLE ' + TABLE_NAME + '_1 ' +
        ' ( id LONG, age INTEGER, name STRING, PRIMARY KEY(id) ) ',
        function (err) {
          test_util.assertDescriptive(err, 'Error: User',
            'Error expected');
          done();

        }
      );
    });

    it('Should execute() Statement ALTER', function (done) {
      store.execute(
        ' ALTER TABLE ' + TABLE_NAME + '_1 ( add avg float default 0 ) ',
        function (err, result) {
          test_util.assertEqual(err, null, 'No error expected');
          assert(result != null, 'Result expected');
          done(err);
        }
      );
    });

    it('Should fail execute() Statement: null', function (done) {
      try {
        store.execute(null, done);
      } catch (err) {
        assert(err !== null, 'Expected parameter error.');
        done();
      }
    });

    it('Should fail execute() Statement: CREATE with Typo', function (done) {
      store.execute(
        ' XCREATE TABLE ' + TABLE_NAME + ' ' +
        ' ( id LONG, age INTEGER, name STRING, PRIMARY KEY(id) ) ',
          function (err) {
          test_util.assertDescriptive(err, 'Error:',
            'Error expected');
          done();

        }
      );
    });

  });

  describe('executeUpdates()', function () {

    it('Should fail executeUpdates() with operations null', function (done) {
      try {
        store.executeUpdates(null, writeOptions, function () {
          done(new Error('No result or error expected.'));
        });
      } catch (error) {
        if (error instanceof Errors.ParameterError)
          done();
        else
          done(error);
      }
    });

    it('Should fail executeUpdates() with operations empty', function (done) {
      try {
        store.executeUpdates([], writeOptions, function () {
          done(new Error('No result or error expected.'));
        });
      } catch (error) {
        if (error instanceof Errors.ParameterError)
          done();
        else
          done(error);
      }
    });

    it('Should fail executeUpdates() with invalid operations', function (done) {
      try {
        store.executeUpdates('  ', writeOptions, function () {
          done(new Error('No result or error expected.'));
        });
      } catch (error) {
        if (error instanceof Errors.ParameterError)
          done();
        else
          done(error);
      }
    });

    it('Should fail executeUpdates() with invalid operations', function (done) {
      try {
        store.executeUpdates(['  '], writeOptions, function () {
          done(new Error('No result or error expected.'));
        });
      } catch (error) {
        if (error instanceof Errors.ParameterError)
          done();
        else
          done(error);
      }
    });

    it('Should fail executeUpdates() with ReturnChoice on WriteOptions',
      function (done) {
        var operation = new types.Operation(
          'TableName',
          types.OperationType.PUT,
          {},
          types.ReturnChoice.ALL,
          true,
          null
        );
        var writeOptions =
          new types.WriteOptions(durability, 1000, types.ReturnChoice.ALL);
        try {
          store.executeUpdates(operation, writeOptions, function () {
            done(new Error('No result or error expected.'));
          });
        } catch (error) {
          if (error instanceof Errors.ParameterError)
            done();
          else
            done(error);
        }
      });

    it('Should fail executeUpdates() with null version for PUT_IF_VERSION',
      function (done) {
        var operation = new types.Operation(
          'TableName',
          types.OperationType.PUT,
          {},
          types.ReturnChoice.ALL,
          true,
          null
        );
        // try to trick operation
        operation.type = types.OperationType.PUT_IF_VERSION;
        try {
          store.executeUpdates(operation, writeOptions, function () {
            done(new Error('No result or error expected.'));
          });
        } catch (error) {
          if (error instanceof Errors.ParameterError)
            done();
          else
            done(error);
        }
      });

    it('Should fail executeUpdates() with null version for DELETE_IF_VERSION',
      function (done) {
        var operation = new types.Operation(
          'TableName',
          types.OperationType.PUT,
          {},
          types.ReturnChoice.ALL,
          true,
          null
        );
        // try to trick operation
        operation.type = types.OperationType.DELETE_IF_VERSION;
        try {
          store.executeUpdates(operation, writeOptions, function () {
            done(new Error('No result or error expected.'));
          });
        } catch (error) {
          if (error instanceof Errors.ParameterError)
            done();
          else
            done(error);
        }
      });

    it('Should fail executeUpdates() with null tableName in Operation',
      function (done) {
        var operation = new types.Operation(
          null,
          types.OperationType.PUT,
          {},
          types.ReturnChoice.ALL,
          true,
          null
        );
        // try to trick operation
        operation.type = types.OperationType.PUT_IF_VERSION;
        try {
          store.executeUpdates(operation, writeOptions, function () {
            done(new Error('No result or error expected.'));
          });
        } catch (error) {
          if (error instanceof Errors.ParameterError)
            done();
          else
            done(error);
        }
      });

    it('Should fail executeUpdates() with null OperationType in Operation',
      function (done) {
        var operation = new types.Operation(
          'TableName',
          null,
          {},
          types.ReturnChoice.ALL,
          true,
          null
        );
        // try to trick operation
        operation.type = types.OperationType.PUT_IF_VERSION;
        try {
          store.executeUpdates(operation, writeOptions, function () {
            done(new Error('No result or error expected.'));
          });
        } catch (error) {
          if (error instanceof Errors.ParameterError)
            done();
          else
            done(error);
        }
      });

    it('Should fail executeUpdates() with null row in Operation',
      function (done) {
        var operation = new types.Operation(
          'TableName',
          types.OperationType.PUT,
          null,
          types.ReturnChoice.ALL,
          true,
          null
        );
        // try to trick operation
        operation.type = types.OperationType.PUT_IF_VERSION;
        try {
          store.executeUpdates(operation, writeOptions, function () {
            done(new Error('No result or error expected.'));
          });
        } catch (error) {
          if (error instanceof Errors.ParameterError)
            done();
          else
            done(error);
        }
      });

    it('Should fail executeUpdates() with wrong tableName in Operation',
      function (done) {
        var operation = new types.Operation(
          'TableName',
          types.OperationType.PUT,
          {},
          types.ReturnChoice.ALL,
          true,
          null
        );
        store.executeUpdates(operation, writeOptions, function (error) {
          if (error instanceof Errors.IllegalArgumentException)
            done();
          else
            done(error);
        });
      });

    it('Should executeUpdates() - PUT', function (done) {
      var operations = [];
      var operation = null;
      var ttl = new Types.TimeToLive(1, Types.TimeUnit.DAYS);
      for (var putCount = 0; putCount < 50; putCount++) {
        var rowToInsert = new test_util.Row(putCount, TEST_ID);
        rowToInsert.ttl = ttl;
        operation = new types.Operation(
          TABLE_NAME,
          types.OperationType.PUT,
          rowToInsert,
          types.ReturnChoice.ALL,
          true,
          null);
        operations.push(operation);
      }
      writeOptions.updateTTL = true;
      store.executeUpdates(operations, writeOptions, function (err, result) {
        if (err)
          done(err);
        else {
          assert(result != null, 'Result expected');
          assert(result.length == 50, 'Result of 50 items expected');

          done();
        }
      });
    });

    it('Should executeUpdates() - PUT_IF_VERSION', function (done) {
      var operations = [];
      var operation = null;
      var START_ID = 0;
      var END_ID = 10;
      var TOTAL_UPDATES = END_ID - START_ID + 1;
      var fieldRange = new types.FieldRange('id', START_ID, true, END_ID, true);
      store.tableIterator(TABLE_NAME, {shardKey: TEST_ID},
        {fieldRange: fieldRange},
        function (err, iterator) {
          if (err)
            done(err);
          else {
            iterator.on('done', function () {
              store.executeUpdates(operations, writeOptions,
                function (err, result) {
                  if (err)
                    done(err);
                  else {
                    assert(result != null, 'Result expected');
                    assert(result.length == TOTAL_UPDATES,
                      'Result of ' + TOTAL_UPDATES +' items expected');
                    done();
                  }
                });
            });

            iterator.forEach(function (error, returnRow) {
              operation = new types.Operation(
                returnRow.table,
                types.OperationType.PUT_IF_VERSION,
                returnRow.row,
                types.ReturnChoice.ALL,
                true,
                returnRow.version);
              operations.push(operation);
            });

          }
        });
    });

    it('Should executeUpdates() - PUT_IF_ABSENT', function (done) {
      var operations = [];
      var START_ID = 0;
      var END_ID = 10;
      var fieldRange =
        new types.FieldRange('id', START_ID, true, END_ID, true);
      store.tableIterator(TABLE_NAME,
        {shardKey: TEST_ID}, {fieldRange: fieldRange},
        function (err, iterator) {
          if (err) done(err); else {
            iterator.on('done', function () {
              store.executeUpdates(operations,
                writeOptions, function (err) {
                    assert(err != null, 'Error expected');
                    done();
                });
            });
            iterator.forEach(function (error, returnRow) {
              returnRow.row.bin = null;
              operations.push(new types.Operation(
                returnRow.table,
                types.OperationType.PUT_IF_ABSENT,
                returnRow.row,
                types.ReturnChoice.ALL,
                true, null));
            });
          }
        });
    });

    it('Should executeUpdates() - PUT_IF_PRESENT', function (done) {
      var operations = [];
      var operation = null;
      var START_ID = 0;
      var END_ID = 10;
      var TOTAL_UPDATES = END_ID - START_ID + 1;
      var fieldRange = new types.FieldRange('id', START_ID, true, END_ID, true);

      store.tableIterator(TABLE_NAME, {shardKey: TEST_ID},
        {fieldRange: fieldRange},
        function (err, iterator) {
          if (err)
            done(err);
          else {
            iterator.on('done', function () {
              store.executeUpdates(operations, writeOptions,
                function (err, result) {
                  if (err)
                    done(err);
                  else {
                    assert(result != null, 'Result expected');
                    assert(result.length == TOTAL_UPDATES,
                      'Result of 50 items expected');
                    done();
                  }
                });
            });

            iterator.forEach(function (error, returnRow) {
              operation = new types.Operation(
                returnRow.table,
                types.OperationType.PUT_IF_PRESENT,
                returnRow.row,
                types.ReturnChoice.ALL,
                true,
                null);
              operations.push(operation);
            });

          }
        });
    });

    it('Should executeUpdates() - DELETE', function (done) {
      var operationsPut = [];
      var operationsDelete = [];
      var operation = null;
      var TOTAL_ITEMS = 20;
      for (var putCount = 0; putCount < TOTAL_ITEMS; putCount++) {
        operation = new types.Operation(
          TABLE_NAME,
          types.OperationType.PUT,
          new test_util.Row(putCount, TEST_ID),
          types.ReturnChoice.ALL,
          true,
          null);
        operationsPut.push(operation);
        operation = new types.Operation(
          TABLE_NAME,
          types.OperationType.DELETE,
          new test_util.Row(putCount, TEST_ID),
          types.ReturnChoice.ALL,
          true,
          null);
        operationsDelete.push(operation);
      }
      store.executeUpdates(operationsPut, writeOptions, function (err, result) {
        if (err)
          done(err);
        else {
          assert(result != null, 'Result expected');
          assert(result.length == TOTAL_ITEMS,
            'Result of ' + TOTAL_ITEMS + ' items expected');

          store.executeUpdates(operationsDelete, writeOptions,
            function (err, result) {
              if (err)
                done(err);
              else {
                assert(result != null, 'Result expected');
                assert(result.length == TOTAL_ITEMS,
                  'Result of ' + TOTAL_ITEMS + ' items expected');
                done();
              }
            });

        }
      });
    });

    it('Should executeUpdates() - DELETE_IF_VERSION', function (done) {
      var operationsPut = [];
      var operationsDelete = [];
      var operation = null;
      var START_ID = 0;
      var END_ID = 10;
      var TOTAL_ITEMS = END_ID - START_ID;
      var fieldRange = new types.FieldRange('id', START_ID, true, END_ID, true);
      for (var putCount = START_ID; putCount < TOTAL_ITEMS; putCount++) {
        operation = new types.Operation(
          TABLE_NAME,
          types.OperationType.PUT,
          new test_util.Row(putCount, TEST_ID),
          types.ReturnChoice.ALL,
          true,
          null);
        operationsPut.push(operation);
      }
      store.executeUpdates(operationsPut, writeOptions, function (err, result) {
        if (err)
          done(err);
        else {
          assert(result != null, 'Result expected');
          assert(result.length == TOTAL_ITEMS,
            'Result of ' + TOTAL_ITEMS + ' items expected');

          store.tableIterator(TABLE_NAME, {shardKey: TEST_ID},
            {fieldRange: fieldRange},
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  store.executeUpdates(operationsDelete, writeOptions,
                    function (err, result) {
                      if (err)
                        done(err);
                      else {
                        assert(result != null, 'Result expected');
                        assert(result.length == TOTAL_ITEMS,
                          'Result of ' + TOTAL_ITEMS + ' items expected');
                        done();
                      }
                    });
                });

                iterator.forEach(function (error, returnRow) {
                  operation = new types.Operation(
                    returnRow.table,
                    types.OperationType.DELETE_IF_VERSION,
                    returnRow.row,
                    types.ReturnChoice.ALL,
                    true,
                    returnRow.version);
                  operationsDelete.push(operation);
                });

              }
            });

        }
      });
    });

  });  // describe

  describe('executeFuture()', function () {
    this.timeout(100000);

    it('Should wait for executeFuture()', function (done) {
      var TABLE = test_util.TABLE_NAME + '_BACK';
      var TABLE_IDX = TABLE_NAME + '_BACK_IDX';
      store.executeFuture(
        ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
        ' ON ' + TABLE + ' ( indexKey1 ) ',
        function (err, executionFuture) {
          if (err)
            done(err);
          else if (!(executionFuture.statementResult.isDone ||
                     executionFuture.statementResult.isCancelled)) {
            console.log('        Step 1: Creating index with.');
            executionFuture.updateStatus(
              function (err) {
                if (err)
                  done(err);
                else  {
                  console.log('        Step 1: Info about the process: OK');
                }
              });

            console.log('        Step 2: multiGet() while process ' +
            'in background.');
            store.multiGet(TABLE_NAME,
              {shardKey: TEST_ID, id: TEST_ID},
              function (err, result) {
                assert(err == null, 'No error expected.');
                assert(result !== null, 'Results expected.');
                console.log('        Step 2: multiGet() OK.');
              });
            console.log('        Step 3: Waiting until index is finished ');
            var newExecutionFuture =
              store.getExecutionFuture(executionFuture.executionId);
            newExecutionFuture.get(
              function (err) {
                if (err) {
                  done(err);
                } else {
                  console.log('        Step 4: Drop index.');
                  store.execute(
                    ' DROP INDEX IF EXISTS ' + TABLE_IDX + ' ON ' + TABLE,
                    function (err) {
                      if (err)
                        done(err);
                      else
                        done();
                    }); // execute
                }
              });
          } else {
            console.log('        Index already exists, dropping...');
            store.execute(
              ' DROP INDEX IF EXISTS ' + TABLE_IDX + ' ON ' + TABLE,
              function (err) {
                if (err)
                  done(err);
                else {
                  console.log('        Please run this test again.');
                  done();
                }
              }); // execute
          }

        }); // executeFuture
    });  // it

    it('Should cancel executeFuture()', function (done) {
      var TABLE = test_util.TABLE_NAME + '_BACK';
      var TABLE_IDX = TABLE_NAME + '_BACK_IDX2';
      store.executeFuture(
        ' CREATE INDEX IF NOT EXISTS ' + TABLE_IDX +
        ' ON ' + TABLE + ' ( indexKey2 ) ',
        function (err, executionFuture) {
          if (err)
            done(err);
          else if (!(executionFuture.statementResult.isDone ||
                     executionFuture.statementResult.isCancelled)) {
            console.log('        Step 1: Creating index with.');
            executionFuture.updateStatus(
              function (err) {
                if (err)
                  done(err);
                else {
                  console.log('        Step 1: Info about the process: OK');
                }
              });

            console.log('        Step 2: multiGet() while process.' +
                        'in background.');
            store.multiGet(TABLE_NAME,
              {shardKey: TEST_ID, id: TEST_ID},
              function (err, result) {
                assert(err == null, 'No error expected.');
                assert(result !== null, 'Results expected.');
                console.log('        Step 2: multiGet() OK.');
              });
            console.log('        Step 3: Waiting until index is finished ');
            executionFuture.cancel(
              function (err) {
                if (err) {
                  done(err);
                } else {
                  console.log('        Step 4: Drop index.');
                  store.execute(
                    ' DROP INDEX IF EXISTS ' + TABLE_IDX +
                    ' ON ' + TABLE,
                    function (err) {
                      if (err)
                        done(err);
                      else
                        done();
                    }); // execute
                }
              });
          } else {
            console.log('        Index already exists, dropping...');
            store.execute(
              ' DROP INDEX IF EXISTS ' + TABLE_IDX + ' ON ' + TABLE,
              function (err) {
                if (err)
                  done(err);
                else {
                  console.log('        Please run this test again.');
                  done();
                }
              }); // execute
          }

        }); // executeFuture
    });  // it

  });

});  // main describe
