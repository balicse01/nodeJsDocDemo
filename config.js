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


/**
 *  This script creates configuration files to be used with examples or
 *  test files.
 *  Usage: node config
 */

var Configuration = require('./nosqldb').Configuration;
var fs = require('fs');

var len = process.argv.length;
//if (len <= 2)
//  showUsage();

var index = 2;

var base = {
    "storeName": "kvstore",
    "storeHelperHosts": ["localhost:5000"],
    "iteratorBufferSize" : 100,
    "proxy" : {
      "startProxy": true,
      "host": "localhost:5010",
      "readZones": "",
      "iteratorExpiration": 5000,
      "maxOpenIterators": 100,
      "numPoolThreads": 10,
      "socketReadTimeout": 5000,
      "socketOpenTimeout": 5000,
      "maxActiveRequests": 10,
      "requestTimeout": 5000,
      "requestThresholdPercent": 100,
      "nodeLimitPercent": 100
    },
    "connectionAttempts" : 3,
    "readZones" : "",
    "username" : null
  };

var outputFile = 'config.json';
while (index < len) {
  var param1 = process.argv[index];
  var param2 = process.argv[index + 1];
  if (param2 == undefined && param1 !=='-h') {
    console.log('\nError processing param: ' + param1);
    console.log('No value specified\n');
    showUsage();
  }
  switch (param1) {
    // STORE RELATED
    case '-s':
      base.storeName = param2;
      break;
    case '-hh':
      param2 = param2.split(',');
      base.storeHelperHosts = param2;
      break;
    case '-bs':
      base.iteratorBufferSize= param2;
      break;
    case '-ca':
      base.connectionAttempts = param2;
      break;
    case '-u':
      base.username = param2;
      break;
    case '-t':
      base.requestTimeout = param2;
      break;

    // PROXY RELATED
    case '-sp':
      base.proxy.startProxy = param2;
      break;
    case '-cj':
      base.proxy.KVCLIENT_JAR = param2;
      break;
    case '-pj':
      base.proxy.KVPROXY_JAR = param2;
      break;
    case '-ph':
      base.proxy.host = param2;
      break;
    case '-rz':
      base.proxy.readZones = param2;
      break;

    case '-ir':
      base.proxy.maxIteratorResults = param2;
      break;
    case '-ie':
      base.proxy.iteratorExpiration = param2;
      break;
    case '-im':
      base.proxy.maxOpenIterators = param2;
      break;
    case '-pt':
      base.proxy.numPoolThreads = param2;
      break;
    case '-sr':
      base.proxy.socketReadTimeout = param2;
      break;
    case '-so':
      base.proxy.socketOpenTimeout = param2;
      break;
    case '-ar':
      base.proxy.maxActiveRequests = param2;
      break;
    case '-rt':
      base.proxy.requestTimeout = param2;
      break;
    case '-rp':
      base.proxy.requestThresholdPercent = param2;
      break;
    case '-nl':
      base.proxy.nodeLimitPercent = param2;
      break;
    case '-v':
      base.proxy.verbose = param2;
      break;

    // OTHER
    case '-o':
      outputFile = param2;
      break;
    case '-h':
      showUsage();
      break;
    default:
      console.log('\nError processing param: ' + param1);
      console.log('Parameter not recognized\n');
      showUsage();
      break;

  }
  index += 2;
}

var final = new Configuration(base);
delete final.defaultConsistency;
delete final.defaultDurability;
delete final.proxy.log4jproperties;
fs.writeFileSync(outputFile, JSON.stringify(final, null, '  '));

function showUsage() {
  console.log(
    'This script creates a configuration file to be used by the included tests');
  console.log(
    'or example files\n');
  console.log('Usage:');
  console.log('node config [options]\n');
  console.log('Options:');

  console.log('\nRELATED TO THE STORE');
  console.log('-s  <String> Store Name');
  console.log('             Default value: kvstore');
  console.log('-hh <String> Helper Hosts: coma separated values with ' +
              'host:port format');
  console.log('             Default value: localhost:5000');
  console.log('-bs <Number> Iterator Buffer Size: the buffer size used on ' +
              'Iterators/Streams');
  console.log('             Default value: 100');
  console.log('-rz <String> Read Zones');
  console.log('             Default value: empty string');
  console.log('-u  <String> Username used on secured stores');
  console.log('             Default value: null');
  console.log('-ca <Number> Connection Attempts to the Proxy/DB');
  console.log('             Default value: 3');
  console.log('-t  <Number> Requests timeout in milliseconds');
  console.log('             Default value: 5000');

  console.log('\nRELATED TO THE PROXY');
  console.log('-sp <Bool>   Start proxy: specifies if proxy is started');
  console.log('             Default: true');
  console.log('-cj <String> Path to kvclient.jar');
  console.log('             Default: current module kvclient.jar');
  console.log('-pj <String> Path to kvproxy.jar');
  console.log('             Default: current module kvproxy.jar');
  console.log('-ph <String> Proxy Host: the host:port for the proxy');
  console.log('             Default value: localhost:5000');
  console.log('-ir <String> Max iterator results');
  console.log('             Default value: 100');
  console.log('-ie <String> Iterator expiration');
  console.log('             Default value: 5000');
  console.log('-im <String> Max open iterators');
  console.log('             Default value: 10');
  console.log('-pt <String> Max num pool threads');
  console.log('             Default value: 10');
  console.log('-sr <String> Socket read timeout');
  console.log('             Default value: 5000');
  console.log('-so <String> Socket open timeout');
  console.log('             Default value: 5000');
  console.log('-ar <String> Max active requests');
  console.log('             Default value: 5000');
  console.log('-rt <String> Request timeout');
  console.log('             Default value: 5000');
  console.log('-rp <String> Request threshold percent');
  console.log('             Default value: 100');
  console.log('-nl <String> Node limit percent');
  console.log('             Default value: 100');
  console.log('-v  <String> Proxy verbose mode');
  console.log('             Default value: false');

  console.log('');
  console.log('-o  <String> The output file name to be used');
  console.log('             Default value: config.json');
  console.log('-h           Show this help');
  process.exit(1);

}
