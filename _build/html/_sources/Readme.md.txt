[![Oracle NoSQL DB](http://www.oracle.com/ocom/groups/public/@otn/documents/webcontent/1876686.jpg)](http://www.oracle.com/technetwork/database/database-technologies/nosqldb/overview/index.html)

# Oracle NoSQL Database Node.js Driver

If there are questions and comments on this release please post them on the
[Oracle NoSQL Page of the Oracle Technology Network](http://forums.oracle.com/forums/forum.jspa?forumID=1388 "Oracle NoSQL Page of the Oracle Technology Network").

## Introduction
This module provides access to the Oracle NoSQL Database.
It requires the use of a proxy server which translates network
activity from the driver to the Oracle NoSQL Database store using a Thrift-based protocol. The proxy is written in pure Java and can run on any machine that is network accessible by your Node.js code and the Oracle NoSQL Database store.

This document assumes that you understand the concepts to operate the Oracle NoSQL Database.

This driver is described in the
[NoSQL Database Node.js Getting Started Guide](http://docs.oracle.com/cd/NOSQL/html/driver_table_nodejs/GSGTablesNJS/index.html) which can be accessed from the [Oracle NoSQL Database documentation page)[http://docs.oracle.com/cd/NOSQL/html/index.html].

## Requirements
* Node.js - this module was tested with v6.6.0.
* A running Oracle NoSQL Database. This release has been certified against the Oracle NoSQL Database versions equal to or higher than 12.2.4.5. This driver may be compatible with releases prior to what is certified but those combinations are not supported by Oracle.

## Changes

See [changelog](Changelog.md) for changes in the current release.

## Installation

This driver is distributed via npmjs.com. To install from npmjs.com,
use the following command:
```sh
$npm install [-g] nosqldb-oraclejs
```

## About the proxy
### Requirements for the proxy server
- Java 7 runtime installed.

The proxy server is a Java application that accepts network traffic from the Node.js driver, translates it into requests that the Oracle NoSQL Database can understand, and forwards the translated request to the store. The proxy also provides
the reverse translation by interpreting store responses and returning them to the client.

The proxy can run on any network accessible machine. It has minimal resource requirements and in most cases can run in the same machine as the Node.js application.

The proxy server bundled with this module during installation. The proxy server resides in the kvproxy directory and is provided as a Java jar file (kvproxy.jar). To use the proxy, you must have a Oracle NoSQL Database installation.

The proxy can be started manually or automatically from your code.

### Running the proxy manually
To run the proxy manually you need the exact location of kvclient.jar and kvproxy.jar to include them on the classpath.

The proxy server itself is started using the command
```sh
java -jar <path-to-kvproxy.jar>
```
The following information is required when you start the proxy
server:

##### -helper-hosts
This is a list of one or more host:port pairs representing Oracle NOSQL Database Storage Nodes that the proxy server can use to connect to the store.

##### -port
The port on which the proxy server listens for connections from the driver. Your application will connect to the proxy using this port.

##### -store
The name of the store instance to use.

A range of other command line options are available. In using the proxy server with a secure store, you must provide authentication
information to the proxy server. In addition, you need to provide a store name to the proxy server. For a description of the proxy server command line options use the -help option from the command line,
```
java -jar <path-to-kvproxy.jar> -help
```

To start the proxy, run the following command:
```
nohup java -jar <path-to-kvproxy.jar> -port 5010 -helper-hosts localhost:5000
```
### Running the proxy automatically
To run a proxy from a JavaScript module you must provide proxy parameters to a
[ProxyConfiguration](http://docs.oracle.com/cd/NOSQL/html/driver_table_nodejs/api-reference/ProxyConfiguration.html)
object. This can be done by filling in the properties of the
ProxyConfiguration that is created as part of a Configuration object (see example below).

## Examples
You can run examples found in the module/examples directory. Make sure the module is reachable by the example.

With a store up and running, you can run an example file using the following
command:
```sh
node example.js
```
Note: Make sure you have nosqldb-oraclejs module installed locally or globally. You can place the example file in a directory and install nosqldb-oraclejs in this directory by using the command:
```sh
npm install [-g] nosqldb-oraclejs
```

If -g is specified, nosqldb-oraclejs will be globally accessible.

Then, to use the module, include nosqldb-oraclejs in your client code:
var nosqldb = require('nosqldb-oraclejs');

For more information about how modules work in Node please refer to:
[Node.js Manual & Documentation](http://nodejs.org/api/modules.html).

The content of example.js would look like this:

```
// Include nosqldb-oraclejs module
var nosqldb = require('nosqldb-oraclejs');

// This is by default, if you encounter problems during your tests,
// Try to change the log level, values are available under
// nosqldb.LOG_LEVELS path:
//   OFF, FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL
nosqldb.Logger.logLevel = nosqldb.LOG_LEVELS.OFF;
nosqldb.Logger.logToConsole = false;
nosqldb.Logger.logToFile = false;

// Working with types
var WriteOptions = nosqldb.Types.WriteOptions;
var Durability = nosqldb.Types.Durability;
var SyncPolicy = nosqldb.Types.SyncPolicy;
var ReplicaAckPolicy = nosqldb.Types.ReplicaAckPolicy;
var ReadOptions = nosqldb.Types.ReadOptions;
var Consistency = nosqldb.Types.SimpleConsistency;

var TABLE_NAME = 'example_table';
var NO_OF_ROWS = 2;

// Create a configuration object
var configuration = new nosqldb.Configuration();
configuration.proxy.startProxy = true;
configuration.proxy.host = 'localhost:5010';
configuration.storeHelperHosts = ['localhost:5000'];
configuration.storeName = 'kvstore';

// Create a store with the specified configuration
var store = nosqldb.createStore(configuration);

// Create an open handler
store.on('open', function () {
  console.log('Connected to store');

  // Create a table
  store.execute(' CREATE TABLE if not exists ' + TABLE_NAME +
  ' ( id long, name string, primary key(id) ) ', function (err) {
    if (err) return;
    store.refreshTables(function (err) {
      if (err) return;

      console.log('Table is created.');
      console.log('Inserting data...');
      // write data in the table
      var writeOptions = new WriteOptions(
        new Durability(SyncPolicy.NO_SYNC,
          ReplicaAckPolicy.ALL, SyncPolicy.NO_SYNC), 1000);

      for (var putCount = 0, putCallback = 0; putCount < NO_OF_ROWS;
           putCount++) {
        // setting up the row
        var row = {id: putCount, name: 'name #' + putCount};

        store.put(TABLE_NAME, row, writeOptions,
          function () {
            console.log('Writing row #' + putCallback++);
          });
      }
      console.log('Reading data...');
      // read data from the table
      var readOptions = new ReadOptions(Consistency.NONE_REQUIRED, 1000);

      for (var getCount = 0, getCallback = 0; getCount < NO_OF_ROWS;
           getCount++) {
        // setup the primary key
        var key = {id: getCount};

        store.get(TABLE_NAME, key, readOptions, function (error, result) {
          console.log('Reading row #' + getCallback);
          console.log(result.currentRow);

          //Close the store on the last callback
          if (++getCallback === NO_OF_ROWS) {
            console.log('Closing connection...');
            store.close();
          }
        });
      }

    }); // RefreshTables
  }); // Execute
}).on('close', function () {
  console.log('Store connection closed.');
  console.log('Shutting down proxy.');
  store.shutdownProxy();
  console.log('Proxy closed.');
}).on('error', function (error) {
  console.log(error);
});

// Open the store
store.open();

```

## Troubleshooting
The logging system is OFF by default. If you encounter problems or want to view events you can change the log level. Values available under .LOG_LEVELS path are: OFF, FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL

Example:
```
var nosqldb = require('nosqldb-oraclejs');
nosqldb.Logger.logLevel = nosqldb.LOG_LEVELS.ALL;
```

Additionally, if no parameters are specified for the Logger, it writes
a file with default options. This file will be read from time to time if no
parameters are specified, the name of the file is: nosqldb.logconf.json. Set
loglevel to 7 to get all the details.


## Package content
<table width="400" border="0">
<tr><td> doc/      </td><td>Documentation reference</td></tr>
<tr><td> lib/      </td><td>The nosqldb-oraclejs source code</td></tr>
<tr><td> kvproxy/  </td><td>Required files to start a proxy server</td></tr>
<tr><td> test/     </td><td>Test cases</td></tr>
<tr><td> examples/ </td><td>Example files</td></tr>
</table>


## Testing
To run the test cases included in the package you need to have mocha installed. To install mocha use:
```
sudo npm install -g mocha
```

You also need the module dependencies, they are:
 - thrift
 - node-int64
 - q
 - nodeunit
 - jsdoc

If you installed the module with npm install, these dependencies should be inside node_modules/nosqldb-oraclejs/node_modules directory.

Then, in the module directory ('nosqldb-oraclejs') run the command:
```sh
mocha -g Setup
```

This will setup the required tables for the tests, then run the command:
```sh
mocha
```

Mocha will automatically look for test directory and try to run the tests.

Tests cases use a file that contains the Configuration object used to connect to
the test store. This file is called test-conf.json and is located under the test
directory.
Modify this file to fit your needs and be sure to:
  - set KVCLIENT_JAR to your kvclient.jar file
  - set KVPROXY_JAR to your kvproxy.jar file

## Documentation
The complete
[Oracle NoSQL database documentation](http://docs.oracle.com/cd/NOSQL/html)
is available online and the JavaScript driver reference is included in the nosqldb-oraclejs doc directory.
