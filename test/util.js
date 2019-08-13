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
 *   Affero General Public License for more message.
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

var Int64 = require('node-int64');

var Parse = require('../lib/parse');
var crypto = require('crypto');

exports.parse = Parse;

var client = require('../nosqldb');
var Types = client.Types;


function assertDescriptive(/*Object*/
                           result,
                           /*String*/
                           error,
                           /*String*/
                           message) {
  if ((result === null) || (result === undefined))
    throw new Error('Expected error: ' + error);
  assert(result.message.search(error) !== -1,
    message + ' - Actual: ' + result.message + '  Expected: ' + error + '');
}
exports.assertDescriptive = assertDescriptive;

function assertEqual(/*Object*/ arg1, /*Error*/ arg2, /*String*/ message) {
  assert.equal(arg1, arg2,
    message + ' - Actual: ' + arg1 + '  Expected: ' + arg2 + '')
}
exports.assertEqual = assertEqual;

function split(/*String*/ string, /*String*/ separator) {
  var pos = string.indexOf(separator);
  var result = [];
  while (pos >= 0) {
    result.push(string.slice(0, pos));
    pos = string.indexOf(separator);
  }
  if (result.length == 0)
    result.push(string);
  return result;
}
exports.split = split;

function compareArrays(/*Array*/ array1, /*Array*/ array2) {
  // Testing for nulls
  if ((!array1) || (!array2))
    return false;

  // Test for Array type
  if (!(array1 instanceof Array) || !(array2 instanceof Array))
    return false;

  // Test for Arrays Lengths
  if (array1.length !== array2.length)
    return false;

  for (var i = 0, l = array1.length; i < l; i++) {
    // Check for nested arrays
    if ((array1[i] instanceof Array && array2[i] instanceof Array) &&
      (!compareArrays(array1[i], array2[i])))
      return false;
    if (array1[i] != array2[i])
      return false;
  }
  return true;
}
exports.compareArrays = compareArrays;

function compareRows(/*Object*/ row1, /*Object*/ row2) {
  // Testing for nulls
  if (!row1)
    return 'First row is not defined';
  if (!row2)
    return 'Second row is not defined';

  for (var key in row1) {
    // check key on row2
    if (!(key in row2))
      return key + ' property not found in row2';

    // Check for Int64
    if ((row1[key] instanceof Int64 && row2[key] instanceof Int64)) {
      if (row1[key].toOctetString('') === row2[key].toOctetString(''))
        return null;
      else
        return key + ' property not equal (Int64)';
    }

    //Check for Array
    if ((row1[key] instanceof Array && row2[key] instanceof Array) &&
      (!compareArrays(row1[key], row2[key]))) {
      return key + ' property not equal (Array)';
      // Check for nested objects
    }

    if ((row1[key] instanceof Object && row2[key] instanceof Object) &&
      (!compareRows(row1[key], row1[key]))) {
      return key + ' property not equal (Object)';
      // Normal value
    }

    if (row1[key] != row2[key]) {
      return key + ' property not equal (Value) [' + row1[key] + ',' +
        row2[key] + ']';
    }
  }
  return null;
}
exports.compareRows = compareRows;

// Preparing Row
var file64 = new Buffer(fs.readFileSync(__dirname + '/image.jpg'))
  .toString('base64');
var fbin64 = new Buffer('1234567890').toString('base64');

function Row(/*Number*/ id, /*Number*/ shardKey) {
  if (id == null)
    id = 0;
  if (shardKey == null)
    shardKey = id;
  this.shardKey = shardKey;
  this.id = id;
  this.indexKey1 = id;
  this.indexKey2 = id;
  this.s = 'String value';
  this.l = new Int64('1111222233334444');  // using Int64 for big numbers
  this.f = 9.123456;     //float
  this.d = 9.12345678901234; //double
  this.bool = true;
  this.bin = file64;
  this.fbin = fbin64;
  this.arrStr = ['X', 'Y', 'Z'];
  this.e = 'A';
  this.address = {
    street: 'address street', city: 'address city',
    state: 'address state', zip: 55555
  };
  this.m = {field1: 'map field 1', field2: 'map field 2'};
}
exports.Row = Row;

/**
 * Create a row with given id and shard key and populate with random 
 * values and an expiration of 1 day.
 * @param id
 * @param shardKey
 * @return
 */
function RandomRow(/*Number*/ id, /*Number*/ shardKey) {
  if (id == null)
    id = 0;
  if (shardKey == null)
    shardKey = id;
  this.shardKey = shardKey;
  this.id = id;
  this.indexKey1 = Math.floor(Math.random() * 100000);
  this.indexKey2 = Math.floor(Math.random() * 100000);
  this.l = Math.floor(Math.random() * 100000);
  this.f = Math.random() * 10;     //float
  this.d = Math.random() * 100; //double
  this.bool = (Math.random() * 10) > 5;
  this.bin = generateRandomData().toString('base64');
  this.fbin = fbin64;
  this.arrStr = [generateRandomString(), generateRandomString()];
  this.e = 'A';
  this.address = {
    street: generateRandomString(), city: generateRandomString(),
    state: generateRandomString(), zip: Math.floor(Math.random() * 10000)
  };
  this.m = {field1: generateRandomString(), field2: generateRandomString()};

  var shasum = crypto.createHash('sha1');
  shasum.update(this.indexKey1.toString());
  shasum.update(this.indexKey2.toString());
  shasum.update(this.l.toString());
  shasum.update(this.bool.toString());
  shasum.update(this.bin.toString());
  shasum.update(this.fbin.toString());
  shasum.update(this.arrStr[0]);
  shasum.update(this.arrStr[1]);
  shasum.update(this.e);
  shasum.update(this.address.street);
  shasum.update(this.address.city);
  shasum.update(this.address.state);
  shasum.update(this.address.zip.toString());
  shasum.update(this.m.field1);
  shasum.update(this.m.field2);
  this.s = shasum.digest('hex');
  
  this.ttl = new Types.TimeToLive(1, Types.TimeUnit.DAYS);
}
exports.RandomRow = RandomRow;

function calculateHashRow(/*Row*/ row) {
  var shasum = crypto.createHash('sha1');
  shasum.update(row.indexKey1.toString());
  shasum.update(row.indexKey2.toString());
  shasum.update(row.l.toString());
  shasum.update(row.bool.toString());
  shasum.update(row.bin.toString());
  shasum.update(row.fbin.toString());
  shasum.update(row.arrStr[0]);
  shasum.update(row.arrStr[1]);
  shasum.update(row.e);
  shasum.update(row.address.street);
  shasum.update(row.address.city);
  shasum.update(row.address.state);
  shasum.update(row.address.zip.toString());
  shasum.update(row.m.field1);
  shasum.update(row.m.field2);
  return shasum.digest('hex');
}
exports.calculateHashRow = calculateHashRow;

function PKey(/*Number*/ id) {
  if (id == null)
    id = 0;
  this.shardKey = id;
  this.id = id;
}
exports.PKey = PKey;

function Row_child(/*Number*/ id) {
  if (id == null)
    id = 0;
  this.shardKey = id;
  this.id = id;
  this.id_child = id;
  this.s_child = 'String value';
  this.l_child = new Int64('1111222233334444');  // using Int64 for big numbers
  this.f_child = 9.123456;     //float
  this.d_child = 9.12345678901234; //double
  this.bool_child = true;
  this.bin_child = file64;
  this.fbin_child = fbin64;
  this.arrStr_child = ['X', 'Y', 'Z'];
  this.e_child = 'A';
}
exports.Row_child = Row_child;

function PKey_child(/*Number*/ id) {
  if (id == null)
    id = 0;
  this.shardKey = id;
  this.id = id;
  this.id_child = id;
}
exports.PKey_child = PKey_child;

function checkSetup(store, callback) {
  console.log('      Verifying table for testing: ' + TABLE_NAME);
  store.open(function (err) {
    if (err)
      callback(err);
    else {
      store.get(TABLE_NAME, {shardKey: 1, id: 1},
        function (err) {
          if (err) {
            err = new Error('Testing Error, table or data not available ' +
            'for this test, use `mocha -g Setup`');
            callback(err);
          } else {
            callback();
          }
        }); // execute
    }
  }); // open
}
exports.checkSetup = checkSetup;

var TABLE_NAME = 'NODEJS_TEST';
exports.TABLE_NAME = TABLE_NAME;

exports.TABLE_NAME_CHILD = 'NODEJS_TEST.CHILD';
exports.TABLE_IDX1 = 'NODEJS_TEST_IDX1';
exports.TABLE_IDX2 = 'NODEJS_TEST_IDX2';

var TABLE_DEFINITION =
  ' ( shardKey INTEGER, ' +
  '   id INTEGER, ' +
  '   indexKey1 INTEGER, ' +
  '   indexKey2 INTEGER, ' + '' +
  '   s STRING, ' +
  '   f FLOAT, ' +
  '   d DOUBLE, ' +
  '   l LONG, ' +
  '   bool BOOLEAN, ' +
  '   arrStr ARRAY(STRING), ' +
  '   bin BINARY, ' +
  '   fbin BINARY(10), ' +
  '   e ENUM(A,B,C), ' +
  '   address RECORD (street STRING, city STRING, state STRING, ' +
  '                   zip INTEGER), ' +
  '   m MAP (STRING), ' +
  '   primary KEY(SHARD(shardKey), id) ) ';
exports.TABLE_DEFINITION = TABLE_DEFINITION;

exports.TABLE_CHILD_DEFINITION =
  ' ( id_child INTEGER, ' +
  '   s_child STRING, ' +
  '   f_child FLOAT, ' +
  '   d_child DOUBLE, ' +
  '   l_child LONG, ' +
  '   bool_child BOOLEAN, ' +
  '   arrStr_child ARRAY(STRING), ' +
  '   bin_child BINARY, ' +
  '   fbin_child BINARY(10), ' +
  '   e_child ENUM(A,B,C), ' +
  '   primary KEY(id_child) ) ';

function generateRandomData() {
  var buf = new Buffer(1024);
  for (var offset = 0; offset < 1024; offset++) {
    buf.writeUInt8(Math.floor(Math.random() * 256), offset);
  }
  return buf;
}
exports.generateRandomData = generateRandomData;

function generateRandomString() {
  var buf = new Buffer(1024);
  for (var offset = 0; offset < 1024; offset++) {
    buf.writeUInt8(Math.floor(Math.random() * 30 + 40), offset);
  }
  return buf.toString();
}

function multiPut(/*Array*/ operations,
                  /*Object*/ store,
                  /*function*/ callback) {
  var durability =
    new Types.Durability(Types.SyncPolicy.NO_SYNC,
      Types.ReplicaAckPolicy.SIMPLE_MAJORITY,
      Types.SyncPolicy.NO_SYNC);
  var writeOptions = new Types.WriteOptions(durability, 1000);
  writeOptions.updateTTL = true;
  var counter = 0;
  function back (err, result) {
    if (err)
      results.push(err);
    else
      results.push(result);
    if (++counter == TOTAL_OPS)
      callback(null, results);
  }

  var results = [];
  var TOTAL_OPS = operations.length;
  for (var index in operations) {
    switch (operations[index].type) {
      case Types.OperationType.PUT:
        //console.log(operations[index].ta);
        store.put(operations[index].tableName, operations[index].row, writeOptions, back);
        break;
      case Types.OperationType.PUT_IF_ABSENT:
        store.putIfAbsent(operations[index].tableName, operations[index].row, writeOptions, back);
        break;
      case Types.OperationType.PUT_IF_PRESENT:
        store.putIfPresent(operations[index].tableName, operations[index].row, back);
        break;
      case Types.OperationType.PUT_IF_VERSION:
        store.putIfVersion(operations[index].tableName, operations[index].row, back);
        break;
    }

  } // for
}
exports.multiPut = multiPut;

