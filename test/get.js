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
var errors = client.Errors;
var test_util = require('./util');
var crypto = require('crypto');

describe('Oracle NoSQLDB', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  var readOptions =
    new types.ReadOptions(types.SimpleConsistency.NONE_REQUIRED, 1000);

  // Preparing store
  var store = client.createStore(configuration);

  var TABLE_NAME = test_util.TABLE_NAME;
  var TABLE_DEFINITION = test_util.TABLE_DEFINITION;

  var TEST_ID = 2;
  var row = new test_util.Row(TEST_ID);
  var fieldRange = new types.FieldRange('id', '0', true, '20', true);
  var primaryKey = {shardKey: TEST_ID, id: TEST_ID};

  this.timeout(5000);

  describe('Get*', function () {
    // execute this before all test cases
    before(function (done) {
      this.timeout(10000);
      test_util.checkSetup(store, done);
    }); // before
    after(function(done) {
        store.close(done);
    });

    describe('get() test cases', function () {

      it('Should Get', function (done) {
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          if (err)
            done(err);
          else {
            var res = test_util.compareRows(result.currentRow, row);
            assert(res===null, 'Error verifying result: ' + res);
            done();
          }
        });
      });

      it('Should fail with null table name ', function (done) {
        try {
          store.get(null, primaryKey, readOptions, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error, 'The parameter tableName is missing',
          'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.get('wrong', primaryKey, readOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Can\'t find table',
            'Error expected');
          assert(result==null, 'Result should be null');
          done();
        });
      });

      it('Should fail with null primary key.', function (done) {
        try {
          store.get(TABLE_NAME, null, readOptions, function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error, 'The parameter primaryKey is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail on wrong primary key', function (done) {
        var primaryKey = {uid:1};
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Primary key is empty',
            'Error expected');
          assert(result==null, 'Result should be null');
          done();
        });
      });

      it('Should fail on partial primary key', function (done) {
        var primaryKey = {shardKey:TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          test_util.assertDescriptive(err, 'Missing primary key field',
            'Error expected');
          assert(result==null, 'Result should be null');
          done();
        });
      });

      it('Should be ok with more fields on primaryKey', function (done) {
        var primaryKey = {shardKey:TEST_ID, id:TEST_ID, uuid:TEST_ID,
          indexKey1:TEST_ID};
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          if (err)
            done(err);
          else {
            assert(result!=null, 'Result should not be null');
            done();
          }
        });
      });

      it('Should Get with no Consistency', function (done) {
        store.get(TABLE_NAME, primaryKey, function (err, result){
          if (err)
            done(err);
          else {
            var res = test_util.compareRows(result.currentRow, row);
            assert(res===null, 'Error verifying result: ' + res);
            done();
          }
        });
      });

      it('Should Get with ABSOLUTE Consistency', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.ABSOLUTE, 1000);
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          if (err)
            done(err);
          else {
            var res = test_util.compareRows(result.currentRow, row);
            assert(res===null, 'Error verifying result: ' + res);
            done();
          }
        });
      });

      it('Should Get with NONE_REQUIRED Consistency', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.NONE_REQUIRED, 1000);
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          if (err)
            done(err);
          else {
            var res = test_util.compareRows(result.currentRow, row);
            assert(res===null, 'Error verifying result: ' + res);
            done();
          }
        });
      });

      it('Should Get with NONE_REQUIRED_NO_MASTER Consistency', function (done) {
        var readOptions = new types.ReadOptions(
          types.SimpleConsistency.NONE_REQUIRED_NO_MASTER, 1000);
        store.get(TABLE_NAME, primaryKey, readOptions, function (err) {
          if (err)
            done();
        });
      });

      // PROXY FAILS WITH TIMEOUT - NEVER RESPONDS - PROBABLY A RETURN MISSING
      //
      //it('Should Get with TimeConsistency', function (done) {
      //  var readOptions =
      //    new types.ReadOptions(new types.TimeConsistency(0, 0), 1000);
      //  store.get(TABLE_NAME, primaryKey, readOptions, function (err) {
      //    if (err)
      //      done();
      //  });
      //});
      //
      //it('Should Get with VersionConsistency', function (done) {
      //  store.get(TABLE_NAME, primaryKey, function (err, result) {
      //    if (err)
      //      done(err);
      //    else {
      //      var readOptions = new types.ReadOptions(
      //        new types.VersionConsistency(result.currentRowVersion, 1000), 1000);
      //      store.get(TABLE_NAME, primaryKey, readOptions, function (err) {
      //        if (err)
      //          done();
      //      });
      //    }
      //  });
      //});

      it('Should Get and writing binary field', function (done) {
        store.get(TABLE_NAME, primaryKey, readOptions, function (err, result) {
          if (err)
            done(err);
          else {
            var res = test_util.compareRows(result.currentRow, row);
            assert(res===null, 'Error verifying result: ' + res);
            fs.writeFile(
              __dirname + '/image-out.jpg',
              new Buffer(result.currentRow.bin, 'base64'), function (err) {
                done(err);
              });
          }
        });
      });

      it('Should fail with negative timeout', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.ABSOLUTE, -1000);
        store.get(TABLE_NAME, primaryKey, readOptions,
          function (err, result) {
            test_util.assertDescriptive(err, 'timeout must be >= 0',
              'Error expected.');
            assert(result==null, 'No result expected');
            done();
          });
      });

    }); // describe

    describe('multiGet() test cases', function () {

      it('Should MultiGet', function (done) {
        var primaryKey = {shardKey: TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].row.id;
                var res = test_util.compareRows(
                  result.returnRows[index].row, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should MultiGet with random data', function (done) {
        var primaryKey = {shardKey: 99}; // id for random data
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions},
          function (err, result) {
            if (err)
              done(err);
            else {
              console.log('          Verifying hashes: ');
              for (var index in result.returnRows) {
                var row = result.returnRows[index].row;
                var hash = test_util.calculateHashRow(row);
                assert(hash == row.s,
                  'No differences expected.');
                console.log('.');
              }
              done();
            }
          });
      });

      it('Should fail with null table name ', function (done) {
        try {
          store.multiGet(null, primaryKey,
            {readOptions: readOptions, fieldRange: fieldRange},
            function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error, 'The parameter tableName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.multiGet('wrong', primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
          test_util.assertDescriptive(err, 'Can\'t find table',
            'Error expected');
          assert(result==null, 'Result should be null');
          done();
        });
      });

      it('Should fail with null primary key.', function (done) {
        try {
          store.multiGet(TABLE_NAME, null,
            {readOptions: readOptions, fieldRange: fieldRange},
            function () {
            throw new Error('No answer expected.');
          });
        } catch (error) {
          test_util.assertDescriptive(error, 'The parameter primaryKey is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail on wrong primary key', function (done) {
        var primaryKey = {uid:1};
        store.multiGet(TABLE_NAME, primaryKey,
          {fieldRange: fieldRange, readOptions: readOptions},
          function (err, result) {
          test_util.assertDescriptive(err, 'Cannot perform multiGet',
            'Error expected');
          assert(result==null, 'Result should be null');
          done();
        });
      });

      it('Should fail with full primaryKey and rangeField ', function (done) {
        var primaryKey = {shardKey:TEST_ID, id:TEST_ID, uuid:TEST_ID,
          indexKey1:TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {fieldRange: fieldRange, readOptions: readOptions},
          function (err, result) {
            test_util.assertDescriptive(err,
              'Cannot specify a FieldRange with a complete primary key',
              'Error expected');
            assert(result==null, 'Result should be null');
            done();
          });
      });

      it('Should Get with no Consistency', function (done) {
        var primaryKey = {shardKey: TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].row.id;
                var res = test_util.compareRows(
                  result.returnRows[index].row, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with ABSOLUTE Consistency', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.ABSOLUTE, 1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].row.id;
                var res = test_util.compareRows(
                  result.returnRows[index].row, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with NONE_REQUIRED Consistency', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.NONE_REQUIRED, 1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].row.id;
                var res = test_util.compareRows(
                  result.returnRows[index].row, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with NONE_REQUIRED_NO_MASTER Consistency', function (done) {
        var consistency = new types.Consistency(
          types.SimpleConsistency.NONE_REQUIRED_NO_MASTER);
        var readOptions = new types.ReadOptions(consistency, 1000);
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err) {
          if (err)
            done();
        });
      });

      it('Should Get with TimeConsistency', function (done) {
        var readOptions =
          new types.ReadOptions(new types.TimeConsistency(1000, 1000), 1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].row.id;
                var res = test_util.compareRows(
                  result.returnRows[index].row, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with VersionConsistency', function (done) {
        store.get(TABLE_NAME, primaryKey, function (err, result) {
          if (err)
            done(err);
          else {
            var readOptions =
              new types.ReadOptions(
                new types.VersionConsistency(result.currentRowVersion, 1000),
                1000);
            var primaryKey = {shardKey: TEST_ID};
            store.multiGet(TABLE_NAME, primaryKey,
              {readOptions: readOptions, fieldRange: fieldRange},
              function (err, result) {
                row.shardKey = TEST_ID;
                if (err)
                  done(err);
                else {
                  console.log('       Verifying received values: ');
                  for (var index in result.returnRows) {
                    console.log(index);
                    // from fieldRange
                    row.id = result.returnRows[index].row.id;
                    var res = test_util.compareRows(
                      result.returnRows[index].row, row);
                    assert(res===null, 'Error verifying result: ' + res);
                  }
                  done();
                }
              });
          }

        });

      });

      it('Should fail with negative timeout', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.ABSOLUTE, -1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGet(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
              test_util.assertDescriptive(err, 'timeout must be >= 0',
                'Negative timeout error expected.');
              done();
          });
      });

    });

    describe('multiGetKeys() test cases', function () {

      it('Should MultiGetKeys', function (done) {
        var primaryKey = {shardKey: TEST_ID};
        var fieldRange = new types.FieldRange('id', '0', true, '20', true);
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            for (var key in result.returnRows) {
              // from fieldRange
              primaryKey.id = result.returnRows[key].key.id;

              var res = test_util.compareRows(
                result.returnRows[key].key, primaryKey);
              assert(res===null, 'Error verifying result: ' + res);
            }
            done(err);
          });

      });

      it('Should fail with null table name ', function (done) {
        try {
          store.multiGetKeys(null, primaryKey,
            {readOptions: readOptions, fieldRange: fieldRange},
            function () {
              throw new Error('No answer expected.');
            });
        } catch (error) {
          test_util.assertDescriptive(error, 'The parameter tableName is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail with wrong table name', function (done) {
        store.multiGetKeys('wrong', primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'Can\'t find table',
              'Error expected');
            assert(result==null, 'Result should be null');
            done();
          });
      });

      it('Should fail with null primary key.', function (done) {
        try {
          store.multiGetKeys(TABLE_NAME, null,
            {readOptions: readOptions, fieldRange: fieldRange},
            function () {
              throw new Error('No answer expected.');
            });
        } catch (error) {
          test_util.assertDescriptive(error, 'The parameter primaryKey is missing',
            'Error expected');
          done();
        }
      });

      it('Should fail on wrong primary key', function (done) {
        var primaryKey = {uid:1};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {fieldRange: fieldRange, readOptions: readOptions},
          function (err, result) {
            test_util.assertDescriptive(err, 'Cannot perform multiGet',
              'Error expected');
            assert(result==null, 'Result should be null');
            done();
          });
      });

      it('Should fail with full primaryKey and rangeField ', function (done) {
        var primaryKey = {shardKey:TEST_ID, id:TEST_ID, uuid:TEST_ID,
          indexKey1:TEST_ID};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {fieldRange: fieldRange, readOptions: readOptions},
          function (err, result) {
            test_util.assertDescriptive(err,
              'Cannot specify a FieldRange with a complete primary key',
              'Error expected');
            assert(result==null, 'Result should be null');
            done();
          });
      });

      it('Should Get with no Consistency', function (done) {
        var primaryKey = {shardKey: TEST_ID};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].key.id;
                var res = test_util.compareRows(
                  result.returnRows[index].key, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with ABSOLUTE Consistency', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.ABSOLUTE, 1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].key.id;
                var res = test_util.compareRows(
                  result.returnRows[index].key, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with NONE_REQUIRED Consistency', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.NONE_REQUIRED, 1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].key.id;
                var res = test_util.compareRows(
                  result.returnRows[index].key, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with NONE_REQUIRED_NO_MASTER Consistency', function (done) {
        var readOptions = new types.ReadOptions(
          types.SimpleConsistency.NONE_REQUIRED_NO_MASTER, 1000);
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err) {
            if (err)
              done();
          });
      });

      it('Should Get with TimeConsistency', function (done) {
        var readOptions =
          new types.ReadOptions(new types.TimeConsistency(0, 0), 1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            row.shardKey = TEST_ID;
            if (err)
              done(err);
            else {
              console.log('       Verifying received values: ');
              for (var index in result.returnRows) {
                console.log(index);
                // from fieldRange
                row.id = result.returnRows[index].key.id;
                var res = test_util.compareRows(
                  result.returnRows[index].key, row);
                assert(res===null, 'Error verifying result: ' + res);
              }
              done();
            }
          });
      });

      it('Should Get with VersionConsistency', function (done) {
        store.get(TABLE_NAME, primaryKey, function (err, result) {
          if (err)
            done(err);
          else {
            var readOptions =
              new types.ReadOptions(
                new types.VersionConsistency(result.currentRowVersion, 1000),
                1000);
            var primaryKey = {shardKey: TEST_ID};
            store.multiGetKeys(TABLE_NAME, primaryKey,
              {readOptions: readOptions, fieldRange: fieldRange},
              function (err, result) {
                row.shardKey = TEST_ID;
                if (err)
                  done(err);
                else {
                  console.log('       Verifying received values: ');
                  for (var index in result.returnRows) {
                    console.log(index);
                    // from fieldRange
                    row.id = result.returnRows[index].key.id;
                    var res = test_util.compareRows(
                      result.returnRows[index].key, row);
                    assert(res===null, 'Error verifying result: ' + res);
                  }
                  done();
                }
              });
          }

        });

      });

      it('Should fail with negative timeout', function (done) {
        var readOptions =
          new types.ReadOptions(types.SimpleConsistency.ABSOLUTE, -1000);
        var primaryKey = {shardKey: TEST_ID};
        store.multiGetKeys(TABLE_NAME, primaryKey,
          {readOptions: readOptions, fieldRange: fieldRange},
          function (err, result) {
            test_util.assertDescriptive(err, 'timeout must be >= 0',
              'Negative timeout error expected.');
            done();
          });
      });


    });



  });


});
