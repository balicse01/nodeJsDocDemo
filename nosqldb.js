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

global.path = require('path');
global.fs = require('fs');
global.assert = require('assert');
global.util = require('util');
global.thrift = require('thrift');
global.module_dir = __dirname;

var Errors = require('./lib/errors');
var Store = require('./lib/store');
var Types = require('./lib/types');
var Config = require('./lib/configuration');
var Logger = require('./lib/logger');
var Proxy = require('./lib/proxy');

// configure logger
var logger = new Logger.Logger();
global.Logger = logger;
global.LOG_LEVELS = Logger.LOG_LEVELS;
exports.Logger = logger;
exports.LOG_LEVELS = Logger.LOG_LEVELS;

global.Errors = Errors;
global.Types = Types;

exports.Errors = Errors;
exports.Types = Types;
exports.Proxy = Proxy;

exports.Configuration = Config.Configuration;
exports.readConfiguration = Config.readConfiguration;
exports.validateConfiguration = Config.validateConfiguration;

/**
 * Establish a connection with a KVStore server configuring and starting a
 * local proxy.
 */
exports.createStore = function createStore(configuration) {
  if (typeof configuration === 'undefined') configuration = new Configuration();
  return new Store(configuration);
};
