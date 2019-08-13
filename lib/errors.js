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

/*global Logger*/

var ttypes = require('./thrift/ondb_types');

/**
 * Generic Error for NoSQL DB Node Client.
 * @constructor
 *
 * @param {Object} message The error message to be included on the object.
 */
function NoSQLDBError(message) {
  Logger.error('NoSQL Error: ' + message);
  Error.call(this, message);
  Error.captureStackTrace(this, NoSQLDBError);
  this.name = 'NoSQLDB-Error';
  this.message = message;
}
util.inherits(NoSQLDBError, Error);
exports.NoSQLDBError = NoSQLDBError;

/**
 * Parameter Error
 * @constructor
 *
 * @param {String} parameter The parameter name.
 * @param {String} extraInfo Additional information about the error.
 */
function ParameterError(parameter, extraInfo) {
  Logger.error('Parameter error: ' + parameter + ' - ' + extraInfo);
  Error.call(this, parameter);
  Error.captureStackTrace(this, ParameterError);
  this.name = 'NoSQLDB-ParameterError';
  this.message = 'The parameter ' + parameter +
  ' is missing or incorrect.'
  if (extraInfo)
    this.message += '\n Extended info: ' + extraInfo;
}
util.inherits(ParameterError, Error);
exports.ParameterError = ParameterError;

function missingParameter(parameter, parameterName, type) {
  if (type)
    if (typeof parameter !== type) {
      var message = parameterName + ' is not of the type ' + type;
      var error = new Errors.ParameterError(parameterName, message);
      Logger.error(error);
      throw error;
    }

  if ((parameter === null) || (parameter === undefined)) {
    var message =
      (parameter === undefined ? 'Missing' : 'Undefined' ) + ' parameter';
    var error = new Errors.ParameterError(parameterName, message);
    Logger.error(error);
    throw error;
  }
}
exports.missingParameter = missingParameter;

/**
 * Connection Error
 * @constructor
 *
 * @param {Object} message The error message to be included on the object.
 * Connection error.
 */
function ConnectionError(message, extraInfo) {
  Logger.error('Connection error: ' + message + ' - ' + extraInfo);
  Error.call(this, message);
  Error.captureStackTrace(this, ConnectionError);
  this.name = 'NoSQLDB-ConnectionError';
  this.message = 'Error with NoSQL DB Connection: ' + message;
  if (extraInfo)
    this.message += '\n' + extraInfo;
}
util.inherits(ConnectionError, Error);
exports.ConnectionError = ConnectionError;

/**
 * Store Error
 * @constructor
 *
 * @param {Object} message The error message to be included on the object.
 * @param {String} extraInfo Additional information about the error.
 * Connection error.
 */
function StoreError(message, extraInfo) {
  Logger.error('Store error: ' + message + ' - ' + extraInfo);
  Error.call(this, message);
  Error.captureStackTrace(this, StoreError);
  this.name = 'NoSQLDB-StoreError';
  this.message = message;
  if (extraInfo)
    this.message += '\n' + extraInfo;
}
util.inherits(StoreError, Error);
exports.StoreError = StoreError;

/**
 * Iterator Error
 * @constructor
 *
 * @param {Object} message The error message to be included on the object.
 */
function IteratorError(message) {
  Logger.error('Iterator error: ' + message);
  Error.call(this, message);
  Error.captureStackTrace(this, IteratorError);
  this.name = 'NoSQLDB-IteratorError';
  this.message = message;
}
util.inherits(IteratorError, Error);
exports.IteratorError = IteratorError;

exports.equal = function (/*Error*/ error, /*String*/ errorMessage) {
  return (error instanceof Error) && (error.message === errorMessage)
};


function getProxyError(error, method) {
  Logger.error('Capturing proxy error: ' + error);
  var result = null;
  if (error instanceof ttypes.TDurabilityException)
    result = new DurabilityException(error);
  else if (error instanceof ttypes.TRequestTimeoutException)
    result = new RequestTimeoutException(error);
  else if (error instanceof ttypes.TFaultException)
    result = new FaultException(error);
  else if (error instanceof ttypes.TConsistencyException)
    result = new ConsistencyException(error);
  else if (error instanceof ttypes.TIllegalArgumentException)
    result = new IllegalArgumentException(error);
  else if (error instanceof ttypes.TIteratorTimeoutException)
    result = new IteratorTimeoutException(error);
  else if (error instanceof ttypes.TUnverifiedConnectionException)
    result = new UnverifiedConnectionException(error);
  else if (error instanceof ttypes.TProxyException)
    result = new ProxyException(error);
  else if (error instanceof ttypes.TCancellationException)
    result = new CancellationException(error);
  else if (error instanceof ttypes.TExecutionException)
    result = new ExecutionException(error);
  else if (error instanceof ttypes.TInterruptedException)
    result = new InterruptedException(error);
  else if (error instanceof ttypes.TTimeoutException)
    result = new TimeoutException(error);
  else if (error instanceof ttypes.TTableOpExecutionException)
    result = new TableOpExecutionException(error);
  else if (error instanceof ttypes.TRequestLimitException)
    result = new RequestLimitException(error);
  else if (error instanceof ttypes.TAuthenticationFailureException)
    result = new AuthenticationFailureException(error);
  else if (error instanceof ttypes.TAuthenticationRequiredException)
    result = new AuthenticationRequiredException(error);
  else if (error instanceof ttypes.TUnauthorizedException)
    result = new UnauthorizedException(error);
  else
    result = new UnknownException(error);

  result.method = method;
  return result;
}
exports.getProxyError = getProxyError;


// Proxy Exceptions
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------

/**
 * Returned when write operations cannot be initiated because a quorum of
 * Replicas as determined by the Durability.ReplicaAckPolicy was not available.
 * The likelihood of this exception being thrown depends on the number of nodes
 * per replication group, the rate of node failures and how quickly a failed
 * node is restored to operation, and the specified ReplicaAckPolicy. The
 * ReplicaAckPolicy for the default durability policy is
 * Durability.ReplicaAckPolicy.SIMPLE_MAJORITY. With SIMPLE_MAJORITY,
 * this exception is thrown only when the majority of nodes in a replication
 * group are unavailable, and in a well-maintained KVStore system with at least
 * three nodes per replication group this exception should rarely be thrown.
 * If the client overrides the default and specifies
 * Durability.ReplicaAckPolicy.ALL, then this exception will be thrown when any
 * node in a replication group is unavailable; in other words, it is much more
 * likely to be thrown. If the client specifies
 * Durability.ReplicaAckPolicy.NONE, then this exception will never be thrown.
 * When this exception is thrown the KVStore service will perform administrative
 * notifications so that actions can be taken to correct the problem. Depending
 * on the nature of the application, the client may wish to:
 * - retry the write operation immediately,
 * - fall back to a read-only mode and resume write operations at a later time,
 * or
 * - give up and report an error at a higher level.
 */
function DurabilityException(args) {
  Error.call(this);
  Error.captureStackTrace(this, DurabilityException);
  this.name = 'DurabilityException';
  this.availableReplicas = null;
  this.commitPolicy = null;
  this.requiredNodeCount = null;
  this.message = null;
  if (args) {
    if (args.availableReplicas !== undefined) {
      this.availableReplicas = args.availableReplicas;
    }
    if (args.commitPolicy !== undefined) {
      this.commitPolicy = args.commitPolicy;
    }
    if (args.requiredNodeCount !== undefined) {
      this.requiredNodeCount = args.requiredNodeCount;
    }
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(DurabilityException, Error);
exports.DurabilityException = DurabilityException;
/**
 * Returned when a request cannot be processed because the configured timeout
 * interval is exceeded.
 * The default timeout interval is five seconds, and this exception should
 * rarely be thrown.
 * Note that the durability of an update operation is uncertain if it results
 * in a RequestTimeoutException being thrown. The changes requested by the
 * update may or may not have been committed to the master or propagated to one
 * or more replicas. Applications may want to retry the update operation if it
 * is idempotent, or perform read operations to determine the outcome of the
 * previous update.
 * Note also that if the consistency specified for a read operation is
 * Consistency.NONE_REQUIRED_NO_MASTER, then this exception will be thrown
 * if the operation is attempted when the only node available is the Master.
 * Depending on the nature of the application, when this exception is thrown
 * the client may wish to:
 * - retry the operation,
 * - fall back to using a larger timeout interval, and resume using the
 * original timeout interval at a later time, or
 * - give up and report an error at a higher level.
 */
function RequestTimeoutException(args) {
  Error.call(this);
  Error.captureStackTrace(this, RequestTimeoutException);
  this.name = 'RequestTimeoutException';
  this.message = null;
  this.timeoutMs = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
    if (args.timeoutMs !== undefined) {
      this.timeoutMs = args.timeoutMs;
    }
  }
}
util.inherits(RequestTimeoutException, Error);
exports.RequestTimeoutException = RequestTimeoutException;

/**
 * Used to indicate an error condition that cannot normally be handled by the
 * caller of the method, except by retrying the operation.
 * When the error occurred remotely and was due to an internally defined server
 * exception.
 * When the error occurred remotely, it will have already been logged and
 * reported on a remote KVStore node and will be available to administrators.
 * However, to correlate client and server errors and to make error information
 * easily accessible on the client, it is good practice to also log the error
 * locally. Errors that originated locally are not automatically logged and
 * available to administrators, and the client application is responsible for
 * reporting them.
 */
function FaultException(args) {
  Error.call(this);
  Error.captureStackTrace(this, FaultException);
  this.name = 'FaultException';
  this.faultClassName = null;
  this.remoteStackTrace = null;
  this.wasLoggedRemotely = null;
  this.message = null;
  if (args) {
    if (args.faultClassName !== undefined) {
      this.faultClassName = args.faultClassName;
    }
    if (args.remoteStackTrace !== undefined) {
      this.remoteStackTrace = args.remoteStackTrace;
    }
    if (args.wasLoggedRemotely !== undefined) {
      this.wasLoggedRemotely = args.wasLoggedRemotely;
    }
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(FaultException, Error);
exports.FaultException = FaultException;

/**
 * Returned when a single or multiple-operation transaction fails because the
 * specified Consistency could not be met, within the allowed timeout period.
 * The likelihood of this exception being thrown depends on the specified
 * Consistency and the general health of the KVStore system. The default
 * consistency policy is SimpleConsistency.NONE_REQUIRED. With
 * SimpleConsistency.NONE_REQUIRED (the default),
 * SimpleConsistency.NONE_REQUIRED_NO_MASTER, or SimpleConsistency.ABSOLUTE,
 * this exception will never be thrown.
 * If the client overrides the default and specifies a TimeConsistency or
 * VersionConsistency setting, then this exception will be thrown when the
 * specified consistency requirement cannot be satisfied within the timeout
 * period associated with the consistency setting. If this exception is
 * encountered frequently, it indicates that the consistency policy
 * requirements are too strict and cannot be met routinely given the load
 * being placed on the system and the hardware resources that are available
 * to service the load.
 * Depending on the nature of the application, when this exception is thrown
 * the client may wish to
 * - retry the read operation,
 * - fall back to using a larger timeout or a less restrictive consistency
 *  setting (for example, SimpleConsistency.NONE_REQUIRED), and resume using
 *  the original consistency setting at a later time, or
 * - give up and report an error at a higher level.
 */
function ConsistencyException(args) {
  Error.call(this);
  Error.captureStackTrace(this, ConsistencyException);
  this.name = 'ConsistencyException';
  this.consistencyPolicy = null;
  this.message = null;
  if (args) {
    if (args.consistencyPolicy !== undefined) {
      this.consistencyPolicy = args.consistencyPolicy;
    }
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(ConsistencyException, Error);
exports.ConsistencyException = ConsistencyException;

/**
 * Returned when any of the arguments sent to the server is wrong.
 */
function IllegalArgumentException(args) {
  Error.call(this);
  Error.captureStackTrace(this, IllegalArgumentException);
  this.name = 'IllegalArgumentException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(IllegalArgumentException, Error);
exports.IllegalArgumentException = IllegalArgumentException;

function IteratorTimeoutException(args) {
  Error.call(this);
  Error.captureStackTrace(this, IteratorTimeoutException);
  this.name = 'IteratorTimeoutException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(IteratorTimeoutException, Error);
exports.IteratorTimeoutException = IteratorTimeoutException;

function UnverifiedConnectionException(args) {
  Error.call(this);
  Error.captureStackTrace(this, UnverifiedConnectionException);
  this.name = 'UnverifiedConnectionException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(UnverifiedConnectionException, Error);
exports.UnverifiedConnectionException = UnverifiedConnectionException;

function ProxyException(args) {
  Error.call(this);
  Error.captureStackTrace(this, ProxyException);
  this.name = 'TProxyException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(ProxyException, Error);
exports.ProxyException = ProxyException;

function CancellationException(args) {
  Error.call(this);
  Error.captureStackTrace(this, CancellationException);
  this.name = 'CancellationException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(CancellationException, Error);
exports.CancellationException = CancellationException;

function ExecutionException(args) {
  Error.call(this);
  Error.captureStackTrace(this, ExecutionException);
  this.name = 'ExecutionException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(ExecutionException, Error);
exports.ExecutionException = ExecutionException;

function InterruptedException(args) {
  Error.call(this);
  Error.captureStackTrace(this, InterruptedException);
  this.name = 'InterruptedException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(InterruptedException, Error);
exports.InterruptedException = InterruptedException;

function TimeoutException(args) {
  Error.call(this);
  Error.captureStackTrace(this, TimeoutException);
  this.name = 'TimeoutException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(TimeoutException, Error);
exports.TimeoutException = TimeoutException;

/**
 * Used to indicate a failure in executeUpdates.
 **/
function TableOpExecutionException(args) {
  Error.call(this);
  Error.captureStackTrace(this, TableOpExecutionException);
  this.name = 'TableOpExecutionException';
  this.operation = null;
  this.failedOperationIndex = null;
  this.operationResult = null;
  this.message = null;
  if (args) {
    if (args.operation !== undefined) {
      this.operation = args.operation;
    }
    if (args.failedOperationIndex !== undefined) {
      this.failedOperationIndex = args.failedOperationIndex;
    }
    if (args.operationResult !== undefined) {
      this.operationResult = args.operationResult;
    }
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(TableOpExecutionException, Error);
exports.TableOpExecutionException = TableOpExecutionException;

/**
 * Thrown when a request cannot be processed because it would exceed the
 * maximum number of active requests for a node as configured by
 * -request-limit.
 **/
function RequestLimitException(args) {
  Error.call(this);
  Error.captureStackTrace(this, RequestLimitException);
  this.name = 'RequestLimitException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(RequestLimitException, Error);
exports.RequestLimitException = RequestLimitException;

/**
 * This exception is thrown if an application passes invalid credentials to
 * an authentication operation.
 **/
function AuthenticationFailureException(args) {
  Error.call(this);
  Error.captureStackTrace(this, AuthenticationFailureException);
  this.name = 'AuthenticationFailureException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(AuthenticationFailureException, Error);
exports.AuthenticationFailureException = AuthenticationFailureException;

/**
 * This exception is thrown when a secured operation is attempted and the
 * client is not currently authenticated. It can occur if login credentials
 * were specified, but the login session has expired, requiring that the client
 * reauthenticate itself.
 **/
function AuthenticationRequiredException(args) {
  Error.call(this);
  Error.captureStackTrace(this, AuthenticationRequiredException);
  this.name = 'AuthenticationRequiredException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(AuthenticationRequiredException, Error);
exports.AuthenticationRequiredException = AuthenticationRequiredException;

/**
 * This exception is thrown from methods where an authenticated user is
 * attempting to perform an operation for which they are not authorized.
 * An application that receives this exception typically should not retry the
 * operation.
 **/
function UnauthorizedException(args) {
  Error.call(this);
  Error.captureStackTrace(this, UnauthorizedException);
  this.name = 'UnauthorizedException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(UnauthorizedException, Error);
exports.UnauthorizedException = UnauthorizedException;

/**
 * This exception is thrown when a non recognized error is received from the
 * proxy.
 **/
function UnknownException(args) {
  Error.call(this);
  Error.captureStackTrace(this, UnauthorizedException);
  this.name = 'UnknownException';
  this.message = null;
  if (args) {
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
}
util.inherits(UnknownException, Error);
exports.UnknownException = UnknownException;

