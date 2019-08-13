# Oracle NoSQL Database JS Driver
# Examples

To run the examples you need to have the nosqldb-oraclejs
module installed (locally or globally) in a reachable location for node.

You also need a running version of Oracle NoSQL Database and configure 
the examples with specific information to connect to that database.

The examples contain a log configuration section. Also, the logger system can help
you identify problems while trying to connect to the database.
To activate the logger, use the following example code:
```
var nosqldb = require('nosqldb-oraclejs');
nosqldb.Logger.logLevel = nosqldb.LOG_LEVELS.ALL;
nosqldb.Logger.logToConsole = true;
nosqldb.Logger.logToFile = true;
```

