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
var child_process = require('child_process');
var test_util = require('./util');
var ttypes = require('../lib/thrift/ondb_types');

describe('Oracle NoSQLDB - Other methods test cases', function () {

  // Preparing Configuration
  var configuration = client.readConfiguration(__dirname + '/test-conf.json');

  describe('version()/status() methods', function () {

    var store = client.createStore(configuration);
    before(function (done) {
      store.open(done);
    });
    after(function(done) {
        store.close(done);
    });

    it('Should fail version() with no moduleInfo', function (done) {
      try {
        store.version(null, function (err, result) {
          done(new Error('No callback expected'));
        });
      } catch (error) {
        if (error instanceof Errors.ParameterError)
          done();
        else
          done(error);
      }
    });
    it('Should call version() - JS_DRIVER', function (done) {
      store.version(types.ModuleInfo.JS_DRIVER, function (err, result) {
        if (err)
          done(err);
        else {
          assert(typeof result == 'string', 'A string is expected');
          console.log('        ' + result);
          done();
        }
      });
    });
    it('Should call version() - JAVA_CLIENT', function (done) {
      store.version(types.ModuleInfo.JAVA_CLIENT, function (err, result) {
        if (err)
          done(err);
        else {
          assert(typeof result == 'string', 'A string is expected');
          console.log('        ' + result);
          done();
        }
      });
    });
    it('Should call version() - PROXY_SERVER', function (done) {
      store.version(types.ModuleInfo.PROXY_SERVER, function (err, result) {
        if (err)
          done(err);
        else {
          assert(typeof result == 'string', 'A string is expected');
          console.log('        ' + result);
          done();
        }
      });
    });

    it('Should fail status() with no moduleInfo', function (done) {
      try {
        store.status(null, function (err, result) {
          done(new Error('No callback expected'));
        });
      } catch (error) {
        if (error instanceof Errors.ParameterError)
          done();
        else
          done(error);
      }
    });
    it('Should call status() - JAVA_CLIENT', function (done) {
      store.status(types.ModuleInfo.JAVA_CLIENT, function (err, result) {
        if (err)
          done(err);
        else {
          assert(typeof result == 'string', 'A string is expected');
          console.log(result);
          done();
        }
      });
    });
    it('Should call status() - PROXY_SERVER', function (done) {
      store.status(types.ModuleInfo.PROXY_SERVER, function (err, result) {
        if (err)
          done(err);
        else {
          assert(typeof result == 'string', 'A string is expected');
          console.log('        ' + result);
          done();
        }
      });
    });
  });  // describe

});  // describe

describe('Secure', function () {

  // Preparing Configuration
  var secure =
    JSON.parse(fs.readFileSync(__dirname + '/secure.json'));
  var kvroot = __dirname + '/kvroot';

  var initCommand = __dirname + '/secure-kv-setup.sh init ' +
    ' -jar ' + secure.KVSTORE_JAR +
    ' -root ' + kvroot +
    ' -store ' + secure.store +
    ' -host localhost ' +
    ' -port ' + secure.port +
    ' -admin ' + secure.admin +
    ' -haRange ' + secure.haRange;

  var stopCommand = __dirname + '/secure-kv-setup.sh stop ' +
    ' -jar ' + secure.KVSTORE_JAR +
    ' -root ' + kvroot;

  var config = new types.Configuration({
    storeName: secure.store,
    storeHelperHosts: ['localhost:' + secure.port],
    username: 'user1'
  });

  config.proxy.startProxy = true;
  config.proxy.host = 'localhost:7000';
  config.proxy.securityFile = kvroot + '/security/client.security';
  config.proxy.maxIteratorResults = 100;
  config.proxy.iteratorExpiration = 50000;
  config.proxy.maxOpenIterators = 10;
  config.proxy.numPoolThreads = 20;
  config.proxy.socketReadTimeout = 50000;
  config.proxy.socketOpenTimeout = 50000;
  config.proxy.maxActiveRequests = 20;
  config.proxy.requestTimeout = 50000;
  config.proxy.requestThresholdPercent = 50;
  config.proxy.nodeLimitPercent = 50;
  config.proxy.verbose = true;
  config.proxy.maxConcurrentRequests = 10;
  config.proxy.maxResultsBatches = 10;

  before(function (done) {
    if (secure.KVSTORE_JAR == "") {
      done(new Error("Please set KVSTORE_JAR from file secure.json and point" +
                     " it to a valid kvstore.jar file."));
      return;
    }
    console.log('\n\n\nThis test will start a secured store, make sure you don\'t' +
    'have another instance of the store running on ports:' +
    secure.port + ', ' +
    secure.admin + ', ' +
    secure.haRange + ', ' +
    'or a proxy running on port 7000.\n');

    this.timeout(5000);
    if (fs.existsSync(kvroot)) {
      var result = child_process.exec(stopCommand,
        {cwd: __dirname, timeout: 5000},
        function (error, stdout, stderr) {
          console.log('Closing previous instance if exists...');
          console.log('stdout: ' + stdout);
          console.log('stderr: ' + stderr);
          if (error !== null) {
            console.log('exec error: ' + error);
          }
          var result = child_process.exec('rm -r kvroot', {cwd: __dirname},
            function (error, stdout, stderr) {
              fs.mkdirSync(kvroot);
              done();
            });
        });
    } else {
      fs.mkdirSync(kvroot);
      done();
    }
  });

  it('Should start and connect to a secured store', function (done) {
    this.timeout(10000000);

    console.log('Init command: ' + initCommand);
    var result = child_process.exec(initCommand,
      {cwd: __dirname, timeout: 40000},
      function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
          console.log('exec error: ' + error);
        }
        var securedStore = client.createStore(config);

        securedStore.open(function (err) {
          if (err)
            throw err;
          else {
            console.log('Open: OK');
            securedStore.execute('CREATE TABLE IF NOT EXISTS firstTable '
            + test_util.TABLE_DEFINITION, function (err, result) {
              if (err)
                done(err);
              else {
                console.log('Table Creation: OK');
                console.log('Closing...');
                securedStore.close(function () {
                  console.log('Shutting down proxy...');
                  securedStore.shutdownProxy(function (err, result) {
                    console.log('Shutting down KVStore...');
                    child_process.exec(stopCommand,
                      {cwd: __dirname, timeout: 5000},
                      function (error, stdout, stderr) {
                        console.log('stdout: ' + stdout);
                        console.log('stderr: ' + stderr);
                        if (error !== null) {
                          console.log('exec error: ' + error);
                        }
                        done();
                      }); // shutDown KVStore

                  }); // shutdownProxy
                });//close connection
              }
            }); // execute

          }
        }); // open
      }); // exec - init
  }); // it
});