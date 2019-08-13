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

var fs = require('fs');
var assert = require('assert');
var client = require('../nosqldb');
var types = client.Types;
var errors = client.Errors;
var test_util = require('./util');
var crypto = require('crypto');

describe('Oracle NoSQLDB', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  var test_row = new test_util.Row();

  var readOptions =
    new types.ReadOptions(types.SimpleConsistency.NONE_REQUIRED, 1000);

  // Preparing store
  var store = client.createStore(configuration);

  var TABLE_NAME = test_util.TABLE_NAME;
  var TABLE_DEFINITION = test_util.TABLE_DEFINITION;

  var TABLE_IDX1 = test_util.TABLE_IDX1;
  var primaryKey = {shardKey: 3};
  test_row.shardKey = 3;
  test_row.indexKey1 = 3;
  test_row.indexKey2 = 3;

  var FIELD_RANGE_START = '5';
  var FIELD_RANGE_END = '50';

  var fieldRange = new types.FieldRange('id', FIELD_RANGE_START, true,
    FIELD_RANGE_END, true);

  describe('Iterator test cases', function () {

    // execute this before all test cases
    before(function (done) {
      this.timeout(10000);
      test_util.checkSetup(store, done);
    }); // before
    after(function(done) {
        store.close(done);
    });

    describe('TableIterator', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.tableIterator(null, primaryKey, function () {
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
        store.tableIterator('wrong', primaryKey,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null primaryKey ', function (done) {
        try {
          store.tableIterator(TABLE_NAME, null, function () {
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
        store.tableIterator(TABLE_NAME, {wrong: 0}, {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'PrimaryKey is missing fields',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should get Iterator Items from forEach() - WYPIWYG',
        function (done) {

          var TEST_ID = 999;
          var START_ID = 1;
          var END_ID = 15;
          var TOTAL_ROWS = END_ID - START_ID + 1;
          var fieldRange = new types.FieldRange('id', START_ID, true,
            END_ID, true);
          var primaryKey = {shardKey: TEST_ID};
          var operations = [];
          for (var count = START_ID; count <= END_ID; count++) {
            var op = new Types.Operation(
              TABLE_NAME, Types.OperationType.PUT,
              new test_util.RandomRow(count, TEST_ID),
              Types.ReturnChoice.NONE, true, null);
            operations.push(op);
          }
          test_util.multiPut(operations, store, function(err, result) {
            if (err)
              done(err);
            else {
              store.tableIterator(TABLE_NAME, primaryKey,
                {direction: types.Direction.FORWARD},
                function (err, iterator) {
                  if (err)
                    done(err);
                  else {
                    iterator.on('done', function () {
                      done();
                    });

                    console.log('          Verifying correctness: ');
                    iterator.forEach(function (err, returnRow) {

                      var row = returnRow.row;
                      var hash = test_util.calculateHashRow(row);
                      assert(hash == row.s,
                        'No differences expected.');
                      assert(returnRow.expirationTime > 0, 'expected ' 
                            + 'non-zero expiration time');
                      var found = false;
                      for (var index = 0; index< operations.length; index++ )
                        if (test_util.compareRows(operations[index], row)==null)
                          found = true;
                      assert(found==false, 'Returned rows should be the same');


                      console.log('.');
                    })
                  }
                }); // tableIterator
            }
          });

        }); // it

      it('Should get Iterator Items from forEach() - random data',
        function (done) {
          var primaryKey = {shardKey: 99};
          store.tableIterator(TABLE_NAME, primaryKey,
            {readOptions: readOptions, direction: types.Direction.UNORDERED},
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  done();
                });

                console.log('          Verifying hashes: ');
                iterator.forEach(function (err, returnRow) {
                  var row = returnRow.row;
                  var hash = test_util.calculateHashRow(row);
                  assert(hash == row.s,
                    'No differences expected.');
                  console.log('.');
                })
              }
            }); // tableIterator
        }); // it

      it('Should get Iterator Items from forEach() from ' + FIELD_RANGE_START +
        ' to ' + FIELD_RANGE_END + ' - UNORDERED',
        function (done) {
          store.tableIterator(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.UNORDERED
            },
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  done();
                });

                console.log('          UNORDERED ids: ');
                iterator.forEach(function (err, returnRow) {
                  var row = returnRow.row;
                  test_util.assertEqual(err, null, 'No error expected');
                  test_row.id = row.id;
                  var res = test_util.compareRows(test_row, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  assert(
                    ((row.id >= FIELD_RANGE_START) &&
                    (row.id <= FIELD_RANGE_END)),
                    'Wrong value for indexKey1');
                  console.log(row.id + ' ');
                })
              }
            }); // tableIterator
        }); // it

      it('Should get Iterator Items from forEach() from ' + FIELD_RANGE_START +
        ' to ' + FIELD_RANGE_END + ' - FORWARD',
        function (done) {
          store.tableIterator(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.FORWARD
            },
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  done();
                });

                console.log('          FORWARD ids: ');
                var index = FIELD_RANGE_START;
                iterator.forEach(function (err, returnRow) {
                  var row = returnRow.row;
                  test_util.assertEqual(err, null, 'No error expected');
                  //console.log("_");
                  test_row.id = index++;  // check order
                  var res = test_util.compareRows(test_row, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  console.log(row.id + ' ');
                });
              }
            }); // tableIterator
        });

      it('Should get Iterator Items from forEach() from ' + FIELD_RANGE_START +
        ' to ' + FIELD_RANGE_END + ' - REVERSE',
        function (done) {
          store.tableIterator(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.REVERSE
            },
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  done();
                });

                console.log('          REVERSE ids: ');
                var index = FIELD_RANGE_END;
                iterator.forEach(function (err, returnRow) {
                  var row = returnRow.row;
                  test_util.assertEqual(err, null, 'No error expected');

                  test_row.id = index--;  // check order
                  var res = test_util.compareRows(test_row, row);
                  assert(res === null, 'Error verifying result: ' + res);
                  console.log(row.id + ' ');
                });
              }
            }); // tableIterator
        });

      it('Should call on(\'done\') from next() ' +
        'when there are no available items',
        function (done) {
          var fieldRange = new types.FieldRange('id', '0', true, '1', false);
          store.tableIterator(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.UNORDERED
            },
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  console.log(' on(\'done\') called!');
                  done();
                });
                console.log('          ids: ');
                iterator.next(function (err, returnRow) {
                  test_util.assertEqual(err, null, 'No error expected');
                  console.log(returnRow.row.id + ' ');
                });
                iterator.next(function (err, returnRow) {
                  assert(err instanceof Error, 'Error expected');
                  test_util.assertEqual(returnRow, null,
                    'No result expected')
                })
              }
            }); // tableIterator
        });

      it('Should get double Items from getCurrent() using forEach()',
        function (done) {
          store.tableIterator(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions, direction: types.Direction.FORWARD
            },
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  done();
                });

                console.log('          ids: ');
                var index = FIELD_RANGE_START;
                iterator.forEach(function (err, returnRow) {
                  test_util.assertEqual(err, null, 'No error expected');

                  test_row.id = index++;  // check order
                  var res = test_util.compareRows(test_row,
                    returnRow.row);
                  assert(res === null, 'Error verifying result: ' + res);
                  console.log(returnRow.row.id);

                  iterator.getCurrent(function (err, returnRow) {
                    test_util.assertEqual(err, null, 'No error expected');
                    var res = test_util.compareRows(test_row,
                      returnRow.row);
                    assert(res === null, 'Error verifying result: ' + res);
                    console.log(returnRow.row.id + ' ');
                  }); // getCurrent
                }); // forEach
              }
            }); // tableIterator
        });

      it('Should get double Items from getCurrent() using next()',
        function (done) {
          store.tableIterator(TABLE_NAME, primaryKey, {
              fieldRange: fieldRange,
              readOptions: readOptions,
              direction: types.Direction.FORWARD
            },
            function (err, iterator) {
              if (err)
                done(err);
              else {
                iterator.on('done', function () {
                  done();
                });
                console.log('          ids: ');
                var index = FIELD_RANGE_START;

                // function designed to grab all items sequentially
                var iterate = function () {
                  iterator.next(function (err, returnRow) {
                    // on error, the iterator reached the end
                    if (err == null) {
                      var row = returnRow.row;
                      test_row.id = index++;  // check order
                      var res = test_util.compareRows(test_row, row);
                      assert(res === null, 'Error verifying result: ' + res);
                      console.log(row.id);
                      iterator.getCurrent(function (err, returnRow) {
                        var row = returnRow.row;
                        test_util.assertEqual(err, null, 'No error expected');
                        var res = test_util.compareRows(test_row, row);
                        assert(res === null, 'Error verifying result: ' + res);
                        console.log(row.id + ' ');
                        iterate();
                      })
                    } else
                    // expect no more elements error
                      test_util.assertDescriptive(err,
                        'No more elements on Iterator',
                        'Expecting [No more elements on Iterator] error');
                  });
                };
                iterate();
              }
            }); // tableIterator
        });
    }); // describe

    describe('TableKeyIterator', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.tableKeyIterator(null, primaryKey, function () {
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
        store.tableKeyIterator('wrong', primaryKey,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null primaryKey ', function (done) {
        try {
          store.tableKeyIterator(TABLE_NAME, null, function () {
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
        store.tableKeyIterator(TABLE_NAME, {wrong: 0}, {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'PrimaryKey is missing fields',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('simple call tableKeyIterator() from ' + FIELD_RANGE_START + ' to ' +
      FIELD_RANGE_END, function (done) {
        store.tableKeyIterator(TABLE_NAME, primaryKey,
          {
            fieldRange: fieldRange, readOptions: readOptions,
            direction: types.Direction.FORWARD
          },
          function (err, iterator) {
            if (err)
              done(err);
            else {
              iterator.on('done', function () {
                done();
              });
              console.log('          ids: ');
              iterator.forEach(function (err, keyWithMetadata) {
                var key = keyWithMetadata.key;
                primaryKey.id = key.id; // from fieldRange
                var res = test_util.compareRows(primaryKey, key);
                assert(res === null, 'Error verifying result: ' + res);
                console.log(key.id + ' ');
              })
            }
          }
        );
      });

      it('tableKeyIterator() for rows with TTL ', function (done) {
            store.tableKeyIterator(TABLE_NAME, primaryKey,
              {direction: types.Direction.FORWARD},
              function (err, iterator) {
                if (err)
                  done(err);
                else {
                  iterator.on('done', function () {
                    done();
                  });
                  console.log('          ids: ');
                  iterator.forEach(function (err, keyWithMetadata) {
                    var key = keyWithMetadata.key;
                    primaryKey.id = key.id; // from fieldRange
                    var res = test_util.compareRows(primaryKey, key);
                    assert(res === null, 'Error verifying result: ' + res);
                    // only these rows were inserted with non-zero TTL
                    // by tableIterator tests
                    var TTL_TEST_ID = 999;
                    if (key.shardKey == TTL_TEST_ID) { 
                      assert(keyWithMetadata.expirationTime > 0,
                          + 'expected non-zero expiration time. Returned ' 
                          + util.inspect(keyWithMetadata));
                    }
                    console.log(key.id + ' ');
                  })
                }
              }
            );
          });

    });  // describe TableKeyIterator

    describe('IndexIterator', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.indexIterator(null, primaryKey, function () {
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
        store.indexIterator('wrong', TABLE_IDX1,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null IndexName ', function (done) {
        try {
          store.indexIterator(TABLE_NAME, null, function () {
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
        store.indexIterator(TABLE_NAME, 'wrong', {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'Not a valid index name',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('simple call indexIterator() with indexKey', function (done) {
        this.timeout(2000);
        var INDEX_VAL = 1;
        var indexKey = {indexKey1: INDEX_VAL};
        store.indexIterator(TABLE_NAME, TABLE_IDX1,
          {
            indexKey: indexKey, readOptions: readOptions,
            direction: types.Direction.FORWARD
          },
          function (err, iterator) {
            assert(err == null, 'No error expected: ' + err);
            console.log('          ids: ');
            var count = 0;
            iterator.on('done', function () {
              console.log(count);
              done();
            });
            iterator.forEach(function (err, returnRow) {
              count++;
              assert(returnRow.row.indexKey1 === INDEX_VAL,
                'Wrong value for indexKey1');
            });

          }); // indexIterator
      }); // it

      it('simple call indexIterator() with fieldRange', function (done) {
        this.timeout(2000);
        var fieldRange = new types.FieldRange('indexKey1',
          FIELD_RANGE_START, true,
          FIELD_RANGE_END, true);
        store.indexIterator(TABLE_NAME, TABLE_IDX1,
          {
            fieldRange: fieldRange, readOptions: readOptions,
            direction: types.Direction.FORWARD
          },
          function (err, iterator) {
            assert(err == null, 'No error expected: ' + err);
            console.log('          ids: ');
            var count = 0;
            iterator.on('done', function () {
              console.log(count);
              done();
            });
            iterator.forEach(function (err, returnRow) {
              count++;
              assert(
                ((returnRow.row.indexKey1 >= FIELD_RANGE_START) &&
                (returnRow.row.indexKey1 <= FIELD_RANGE_END)),
                'Wrong value for indexKey1');
            });

          }); // indexIterator
      }); // it

    });  // describe IndexIterator

    describe('IndexKeyIterator', function () {

      it('Should fail with null table name ', function (done) {
        try {
          store.indexKeyIterator(null, primaryKey, function () {
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
        store.indexKeyIterator('wrong', TABLE_IDX1,
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null IndexName ', function (done) {
        try {
          store.indexKeyIterator(TABLE_NAME, null, function () {
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
        store.indexKeyIterator(TABLE_NAME, 'wrong', {fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'Not a valid index name',
              'Error expected');
            assert(result == null, 'Result should be null');
            done();
          });
      });

      it('Simple call indexKeyIterator() with indexKey', function (done) {
        var indexKey = {indexKey1: 5};
        this.timeout(2000);
        store.indexKeyIterator(TABLE_NAME, TABLE_IDX1,
          {
            indexKey: indexKey,
            readOptions: readOptions, direction: types.Direction.UNORDERED
          },
          function (err, iterator) {
            assert(err == null, 'No error expected: ' + err);
            console.log('          ids: ');
            var count = 0;
            iterator.on('done', function () {
              console.log(count);
              done();
            });
            iterator.forEach(function (err, keyPair) {
                count++;
              console.log(util.inspect(keyPair));
              assert(
                  ((keyPair.secondary.indexKey1 >=
                    FIELD_RANGE_START) &&
                   (keyPair.secondary.indexKey1 <=
                    FIELD_RANGE_END)),
                'Wrong value for indexKey1');
            });

          }); // indexIterator
      });

      it('simple call indexKeyIterator() with fieldRange', function (done) {
        this.timeout(2000);
        var fieldRange = new types.FieldRange('indexKey1',
          FIELD_RANGE_START, true,
          FIELD_RANGE_END, true);
        store.indexKeyIterator(TABLE_NAME, TABLE_IDX1,
          {
            fieldRange: fieldRange, readOptions: readOptions,
            direction: types.Direction.FORWARD
          },
          function (err, iterator) {
            assert(err == null, 'No error expected: ' + err);
            console.log('          ids: ');
            var count = 0;
            iterator.on('done', function () {
              console.log(count);
              done();
            });
            iterator.forEach(function (err, keyPair) {
              count++;
              assert(
                  ((keyPair.secondary.indexKey1 >=
                    FIELD_RANGE_START) &&
                   (keyPair.secondary.indexKey1 <=
                    FIELD_RANGE_END)),
                'Wrong value for indexKey1');
            });

          }); // indexIterator
      }); // it

    });  // describe IndexIterator

  });  // describe Iterators

});
