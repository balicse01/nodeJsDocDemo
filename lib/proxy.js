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

/*global Logger*/
/*global Errors*/
/*global module_dir*/
/*global fs*/

var child_process = require('child_process');
var ONDBClient = require('./thrift/ONDB');

var PROXY_TIMEOUT = 4000;
var PROXY_ERROR_TIMEOUT = 1000;

function getPortFlag(/*Configuration*/ configuration) {
  var hostPort = configuration.proxy.host;
  var colon = hostPort.indexOf(':');
  var port = hostPort.substr(colon + 1);
  if (port)
    return ' -port ' + port;
  return '';
}

function getHostsFlag(/*Configuration*/ configuration) {
  var storeHelperHosts = configuration.storeHelperHosts;
  Logger.debug('[PROXY] Helper hosts: ' + storeHelperHosts);

  var flag = '';

  if (storeHelperHosts) {
    Logger.debug('[PROXY] Helper hosts: ' + typeof storeHelperHosts);
    var hosts;
    if (typeof storeHelperHosts === 'array') {
      var firstComa = true;
      for (var _host in storeHelperHosts) {
        hosts += (firstComa ? '' : ',') + _host;
        firstComa = false;
      }
    } else {
      hosts = storeHelperHosts;
    }
    flag = ' -helper-hosts ' + hosts;
    Logger.debug('Host flag for proxy: ' + flag);
  }
  return flag;
}

function getStoreFlag(/*Configuration*/ configuration) {
  var store = configuration.storeName;
  if (store)
    if (typeof store === 'string')
      if (store.length > 0)
        return ' -store ' + store;
  return '';
}

function getProxyClasspath(/*Configuration*/ configuration) {
  return ' -cp ' +
         path.normalize(configuration.proxy.KVCLIENT_JAR) +
         (process.platform === 'win32' ? ';' : ':') +
         path.normalize(configuration.proxy.KVPROXY_JAR);
}

function numericFlag(/*Number*/ flag, /*String*/ flagName) {
  var result = '';
  if (flag) {
    flag = parseInt(flag);
    if (!isNaN(flag))
      result = ' ' + flagName + ' ' + flag;
  }
  return result;
}

function getNumericFlags(/*Configuration*/ configuration) {
  var flags = '';
  flags += numericFlag(configuration.proxy.maxIteratorResults,
    '-max-iterator-results');
  flags += numericFlag(configuration.proxy.iteratorExpiration,
    '-iterator-expiration');
  flags += numericFlag(configuration.proxy.maxOpenIterators,
    '-max-open-iterators');
  flags += numericFlag(configuration.proxy.numPoolThreads,
    '-num-pool-threads');
  flags += numericFlag(configuration.proxy.socketReadTimeout,
    '-socket-read-timeout');
  flags += numericFlag(configuration.proxy.socketOpenTimeout,
    '-socket-open-timeout');
  flags += numericFlag(configuration.proxy.maxActiveRequests,
    '-max-active-requests');
  flags += numericFlag(configuration.proxy.requestTimeout,
    '-request-timeout');
  flags += numericFlag(configuration.proxy.requestThresholdPercent,
    '-request-threshold-percent');
  flags += numericFlag(configuration.proxy.nodeLimitPercent,
    '-node-limit-percent');
  flags += numericFlag(configuration.proxy.maxConcurrentRequests,
    '-max-concurrent-requests');
  flags += numericFlag(configuration.proxy.maxResultsBatches,
    '-max-results-batches');
  return flags;
}

function getSecurityFlag(/*Configuration*/ configuration) {
  var securityFlag = '';
  if (configuration.proxy.securityFile &&
      (configuration.proxy.securityFile !== '')) {
    securityFlag =
    ' -security ' + configuration.proxy.securityFile +
    ' -username ' + configuration.username;
    Logger.debug('[PROXY] Using security properties from: ' +
                 configuration.proxy.securityFile);
  }
  return securityFlag;
}

function getLog4jFlag(/*Configuration*/ configuration) {
  var log4jproperties = '';
  if (fs.existsSync(configuration.proxy.log4jproperties))
    log4jproperties =
    ' -Dlog4j.configuration=' + configuration.proxy.log4jproperties;
  return log4jproperties;
}

function getVerboseFlag(/*Configuration*/ configuration) {
  var verbose = '';
  if (configuration.proxy.verbose === true)
    verbose = ' -verbose';
  return verbose;
}

/**
 * Defines a set of configuration values used to connect or create a proxy
 * instance. This is just the constructor with no parameters, once this object
 * is created you can change any parameter.
 * @param {Object} [options] An object with the initial values to construct
 * ProxyConfiguration, the object has the following format:
 *      { startProxy : true,
 *        KVCLIENT_JAR: '',
 *        KVPROXY_JAR: '',
 *        .....
 * @property {boolean} startProxy Indicates if the module should try to start a
 *   proxy instance from which it will connect to a Oracle NoSQL Database Store.
 * @property {String} KVCLIENT_JAR The path where the file kvclient.jar is
 *   located, required to start a local proxy.
 * @property {String} KVPROXY_JAR The path where the proxy files are located.
 *  the default value is the location to the driver's proxy included files.
 * @property {String} host Indicates the host:port for a proxy to connect, if
 *   startProxy is set to true, then this parameter is used to start the proxy
 *   at this host:port.
 * @property {Number} maxIteratorResults A long representing the maximum number
 * of results returned in one single iterator call. Default: 100
 * @property {Number} iteratorExpiration Iterator expiration interval in
 * milliseconds.
 * @property {Number} maxOpenIterators Maximum concurrent opened iterators.
 * Default: 10000
 * @property {Number} numPoolThreads Number of proxy threads. Default: 20
 * @property {Number} socketReadTimeout Configures the read timeout in
 * milliseconds associated with the underlying sockets to the store.
 * @property {Number} socketOpenTimeout Configures the open timeout in
 * milliseconds used when establishing sockets to the store.
 * @property {Number} maxActiveRequests Maximum number of active requests
 * towards the store.
 * @property {Number} requestTimeout Configures the default request timeout in
 * milliseconds.
 * @property {Number} requestThresholdPercent Threshold for activating request
 * limiting, as a percentage of the requested maximum active requests.
 * @property {Number} nodeLimitPercent Limit on the number of requests, as a
 * percentage of the requested maximum active requests.
 * @property {String} securityFile The security file with properties to be used
 *   in a secured store.
 * @property {bool} verbose Verbose flag.
 * @property {String} log4jproperties The file used by log4j to configure
 * logging.
 * @property {Number} maxConcurrentRequests The maximum number of concurrent
 * requests per iterator.
 * Default value is set to no of available processors * 2.
 * @property {Number} maxResultsBatches The maximum number of results batches
 * that can be held in the proxy per iterator. Default: 0, which means it will
 * be set automatically by kv.client based on the -max-concurrent-requests.
 * @constructor
 */
function ProxyConfiguration(/*Object*/ options) {
  this.startProxy = false;
  // Set defaults
  if (process.env.KVCLIENT_JAR !== undefined)
    if (fs.existsSync(process.env.KVCLIENT_JAR))
      this.KVCLIENT_JAR = process.env.KVCLIENT_JAR;
  if (process.env.KVPROXY_JAR !== undefined)
    if (fs.existsSync(process.env.KVPROXY_JAR))
      this.KVPROXY_JAR = process.env.KVPROXY_JAR;
  if (fs.existsSync(path.normalize(module_dir + '/kvproxy/kvclient.jar')))
    this.KVCLIENT_JAR = 
      this.KVCLIENT_JAR || 
      path.normalize(module_dir + '/kvproxy/kvclient.jar');
  if (fs.existsSync(path.normalize(module_dir + '/kvproxy/kvproxy.jar')))
    this.KVPROXY_JAR = 
      this.KVPROXY_JAR ||
      path.normalize(module_dir + '/kvproxy/kvproxy.jar');
  this.host = null;
  this.maxIteratorResults = null;
  this.iteratorExpiration = null;
  this.maxOpenIterators = null;
  this.numPoolThreads = null;
  this.socketReadTimeout = null;
  this.socketOpenTimeout = null;
  this.maxActiveRequests = null;
  this.requestTimeout = null;
  this.requestThresholdPercent = null;
  this.nodeLimitPercent = null;
  this.securityFile = null;
  this.verbose = true;
  this.log4jproperties =
  path.normalize(module_dir + '/kvproxy/log4j.properties');
  this.maxConcurrentRequests = null;
  this.maxResultsBatches = null;

  // Set values from options
  if (options) {
    if (options.startProxy !== undefined)
      this.startProxy = options.startProxy;
    if (options.KVCLIENT_JAR !== undefined)
      this.KVCLIENT_JAR = options.KVCLIENT_JAR;
    if (options.KVPROXY_JAR !== undefined)
      this.KVPROXY_JAR = options.KVPROXY_JAR;
    if (options.host !== undefined)
      this.host = options.host;
    if (options.maxIteratorResults !== undefined)
      this.maxIteratorResults = options.maxIteratorResults;
    if (options.iteratorExpiration !== undefined)
      this.iteratorExpiration = options.iteratorExpiration;
    if (options.maxOpenIterators !== undefined)
      this.maxOpenIterators = options.maxOpenIterators;
    if (options.numPoolThreads !== undefined)
      this.numPoolThreads = options.numPoolThreads;
    if (options.socketReadTimeout !== undefined)
      this.socketReadTimeout = options.socketReadTimeout;
    if (options.socketOpenTimeout !== undefined)
      this.socketOpenTimeout = options.socketOpenTimeout;
    if (options.maxActiveRequests !== undefined)
      this.maxActiveRequests = options.maxActiveRequests;
    if (options.requestTimeout !== undefined)
      this.requestTimeout = options.requestTimeout;
    if (options.requestThresholdPercent !== undefined)
      this.requestThresholdPercent = options.requestThresholdPercent;
    if (options.nodeLimitPercent !== undefined)
      this.nodeLimitPercent = options.nodeLimitPercent;
    if (options.securityFile !== undefined)
      this.securityFile = options.securityFile;
    if (options.verbose !== undefined)
      this.verbose = options.verbose;
    if (options.log4jproperties !== undefined)
      this.log4jproperties = options.log4jproperties;
    if (options.maxConcurrentRequests !== undefined)
      this.maxConcurrentRequests = options.maxConcurrentRequests;
    if (options.maxResultsBatches !== undefined)
      this.maxResultsBatches = options.maxResultsBatches;
  }
}
exports.ProxyConfiguration = ProxyConfiguration;

function checkJava(callback) {
  callback = callback || function () {
  };
  Logger.debug('Check that Java environment is installed');
  var java = child_process.spawn('java', ['-version']);
  java.stderr.on('data', function onDataStderr(data) {
    callback();
    callback = null;
    clearTimeout(timeout);
    removeall();
  });
  java.stdin.on('data', function onDataStdin(data) {
    callback();
    callback = null;
    clearTimeout(timeout);
    removeall();
  });
  java.stdout.on('data', function onDataStdout(data) {
    callback();
    callback = null;
    clearTimeout(timeout);
    removeall();
  });
  java.on('error', function onErrorJava(error) {
    callback(error);
    callback = null;
    clearTimeout(timeout);
    removeall();
  });
  var timeout = setTimeout(function timeoutJava() {
    callback(false)
  }, 4000);

  function removeall() {
    java.stderr.removeAllListeners('data');
    java.stdin.removeAllListeners('data');
    java.stdout.removeAllListeners('data');
    java.removeAllListeners('error');
  }
}
exports.checkJava = checkJava;

/**
 * Starts a proxy with the specified configuration.
 * @param {Configuration} configuration The configuration object used to
 *   start or connect to a proxy.
 * @param {function} callback Function called after the proxy is started.
 */
function startProxy(configuration, callback) {
  callback = callback || function () {
  };
  Logger.info('[PROXY] Start proxy');
  checkJava(function backCheckJava(err) {
    if (err) {
      Logger.error('Java not found');
      callback(new Errors.ProxyError('Error trying to find java client', err));
      return;
    }
    /// Assemble command line
    var commandLine =
      (process.platform === 'win32' ? "start /B " : "nohup ") + ' java ' +
      getLog4jFlag(configuration) +
      getProxyClasspath(configuration) +
      ' oracle.kv.proxy.KVProxy ' +
      getHostsFlag(configuration) +
      getPortFlag(configuration) +
      getStoreFlag(configuration) +
      getSecurityFlag(configuration) +
      getNumericFlags(configuration) +
      getVerboseFlag(configuration) +
      (process.platform === 'win32' ? " " : " & ");

    Logger.debug('[PROXY] Proxy launch command: ' + commandLine);

    var timeoutOnError;
    var timeoutStartProxy;
    var proxy = child_process.exec(commandLine, {timeout: PROXY_TIMEOUT},
      function backChildProcess(error, stdout, stderr) {
        var info = {error: error, stdout: stdout, stderr: stderr};
        Logger.debug('[PROXY] output:  ' + JSON.stringify(info));
        if (callback) timeoutOnError = setTimeout(function timeoutOnError() {
          clearTimeout(timeoutStartProxy);
          Logger.debug('[PROXY] Error setting up the proxy - Timeout');
          var error = new Errors.NoSQLDBError(
            'Error setting up the proxy - Timeout', info);
          callback(error, stderr);
          callback = null;
        }, PROXY_ERROR_TIMEOUT);
      });
    proxy.on('exit', function onExitProxy(code) {
      Logger.debug('[PROXY] Proxy launched with code:' + code);

      if (callback) timeoutStartProxy =
                    setTimeout(function timeoutStartProxy() {
                      clearTimeout(timeoutOnError);
                      Logger.debug('[PROXY] Return after ' +
                                   (PROXY_TIMEOUT / 1000) +
                                   ' secs');
                      callback(null, code);
                      callback = null;
                      //proxy.kill('SIGHUP');
                    }, PROXY_TIMEOUT);
      proxy.removeAllListeners('exit');
    });
  })
}
exports.startProxy = startProxy;

/**
 * Shutdown the proxy. If a proxy is running, this method will shutdown it.
 * @param {ProxyConfiguration} proxyConfiguration the configuration used to
 *   start the proxy.
 * @param {function} callback Function called after trying to shutdown the
 *   proxy.
 */
function stopProxy(proxyConfiguration, callback) {
  Logger.debug('Shutdown proxy via connection');
  callback = callback || function () {
  };
  var colon = proxyConfiguration.host.indexOf(':');
  var host = proxyConfiguration.host.substr(0, colon);
  var port = proxyConfiguration.host.substr(colon + 1);
  var connection = thrift.createConnection(host, port, {
    transport: thrift.TFramedTransport,
    protocol: thrift.TBinaryProtocol
  }).on('error', function onErrorStop(err) {
    Logger.debug('Can\'t connect to the proxy to stop it - ' + err);
    var error = new Errors.ProxyError(err);
    callback(error);
    callback = null;
    connection.removeAllListeners('error');
    connection.removeAllListeners('connect');
  }).on('connect', function onConnectStop(err) {
    Logger.debug('Thrift Connection successful');
    var client = thrift.createClient(ONDBClient, connection);
    client.shutdown();
    connection.end();
    callback();
    callback = null;
    connection.removeAllListeners('error');
    connection.removeAllListeners('connect');
  });
}

exports.stopProxy = stopProxy;
