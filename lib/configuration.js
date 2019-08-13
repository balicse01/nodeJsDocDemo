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

var Types = require('./types');
var Proxy = require('./proxy');


var defaultDurability = new Types.Durability(
  Types.SyncPolicy.NO_SYNC,
  Types.ReplicaAckPolicy.SIMPLE_MAJORITY,
  Types.SyncPolicy.NO_SYNC);
exports.defaultDurability = defaultDurability;

var defaultConsistency = new Types.Consistency(
  Types.SimpleConsistency.NONE_REQUIRED);
exports.defaultConsistency = defaultConsistency;

/**
 * Defines a set of configuration values used to connect to an Oracle NoSQL
 * Database.
 * @param {Object} [options] An object with the initial values to construct
 * Configuration, the object has the following format:
 *      { storeName : '',
 *        storeHelperHosts: '',
 *        defaultDurability : Durability,
 *        defaultConsistency : Consistency,
 *        requestTimeout: 0,
 *        iteratorBufferSize : 0,
 *        readZones: [''],
 *        username: '',
 *        connectionAttempts : 0,
 *        proxy : ProxyConfiguration }
 * @property {String} storeName Indicates the name of the store to be
 * connected with.
 * @property {Array} storeHelperHosts Indicates the helper host to be
 * used with this connection.
 * @property {Consistency} defaultConsistency Indicates the consistency
 * used by default.
 * @property {Durability} defaultDurability Indicates the durability
 * used by default.
 * @property {Number} requestTimeout The timeout used for any request
 * to the proxy.
 * @property {Number} iteratorBufferSize The number of rows used as
 * buffer by Iterators or Streams.
 * @property {Array} readZones Indicates the read zones to be used
 * with this connection.
 * @property {String} username The username used when connecting to a
 * server.
 * @property {Number} connectionAttempts The number of attempts to try
 * when connecting to a server.
 * @property {Proxy} proxy The proxy configuration.
 * @constructor
 */
function Configuration(/*Object*/ options) {

  this.storeName = null;
  this.storeHelperHosts = null;
  this.defaultDurability = defaultDurability;
  this.defaultConsistency = defaultConsistency;
  this.requestTimeout = 5000;
  this.iteratorBufferSize = 100;
  this.readZones = null;
  this.username = null;
  this.connectionAttempts = 3;
  this.proxy = new Proxy.ProxyConfiguration(null);

  if (options) {
    if (options.storeName !== undefined)
      this.storeName = options.storeName;
    if (options.storeName !== undefined)
      this.storeName = options.storeName;
    if (options.storeHelperHosts !== undefined)
      this.storeHelperHosts = options.storeHelperHosts;
    if (options.defaultDurability !== undefined)
      this.defaultDurability = options.defaultDurability;
    if (options.defaultConsistency !== undefined)
      this.defaultConsistency = options.defaultConsistency;
    if (options.requestTimeout !== undefined)
      this.requestTimeout = options.requestTimeout;
    if (options.iteratorBufferSize !== undefined)
      this.iteratorBufferSize = options.iteratorBufferSize;
    if (options.readZones !== undefined)
      this.readZones = options.readZones;
    if (options.username !== undefined)
      this.username = options.username;
    if (options.connectionAttempts !== undefined)
      this.connectionAttempts = options.connectionAttempts;
    if (options.proxy !== undefined)
      this.proxy = new Proxy.ProxyConfiguration(options.proxy);
  }

}

exports.Configuration = Configuration;


/**
 * Tries to read a file with a ProxyConfiguration object
 * @param {string} filename the full path for the file
 * @returns {Configuration}
 */
function readConfiguration(filename) {
  if (fs.existsSync(filename)) {
    var options = JSON.parse(fs.readFileSync(filename));
    var configuration = new Configuration(options);
    validateConfiguration(configuration);

    // no file can hold these items, they have thrift methods
    configuration.defaultConsistency = defaultConsistency;
    configuration.defaultDurability = defaultDurability;

    return configuration;
  } else {
    throw new Errors.NoSQLDBError (
      'The specified file \'' + filename +
      '\' was not found' );
  }
}
exports.readConfiguration = readConfiguration;

function validateConfiguration(/*Configuration*/ configuration) {
  if (typeof configuration.proxy.startProxy === 'undefined')
    throw new Errors.ParameterError('startProxy');
  if (typeof configuration.proxy.host === 'undefined')
    throw new Errors.ParameterError('host');
  if (configuration.proxy.startProxy) {
    if (typeof configuration.proxy.KVCLIENT_JAR === 'undefined')
      throw new Errors.ParameterError('KVCLIENT_JAR');
    if (typeof configuration.proxy.KVPROXY_JAR === 'undefined')
      throw new Errors.ParameterError('KVPROXY_JAR');
  }
}
exports.validateConfiguration = validateConfiguration;
