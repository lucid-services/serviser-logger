
```javascript
var logger = require('bi-logger');
```

- Logger's behavior is configured via a config object (**Example 1**) provided to `logger.reinitialize` method.  
- Unless the logger is reinitialized with user defined configuration, the logger saves logs to the `porcess.cwd() + '/logs'` dirrectory (=default behavior).  

**Example 1**

```javascript
{
    exitOnError: false,  // determines whether a process will exit with status code 1 on 'uncaughtException' event
    transports: [
        {
            type: 'fluentd', // [required]
            priority: 1, // [default=Infinity] [required]
            origin: 'bi-depot', // [required]
            host: '127.0.0.1', // [required]
            port: 24224, // [required]
            timeout: 3, // [optional]
            reconnectInterval: 60000 //ms [optional]
        },
        {
            type: 'file',
            level: 'error', // maximum log level of this sepecific transport, [optional]
            priority: 2,
            dir: 'logs', // can be absolute or relative to the node's process
            autocreate: true // whether the `dir` should be created if it does not exist
        },
        {
            type: 'console',
            level: 'uncaughtException',
            priority: 3
        }
    ]
}
```

- The above config sets up the logger so that all messages are sent to `fluentd` server.  
- If temporary failure of the `fluentd` logger is experienced, reason behind the failure is logged into the `./logs/fault-${date}.json` file.  
- Meanwhile, the `fluentd` transports continues to buffer its logs and tries to reconnect to the fluentd server.  
- Once connection is successfull, internal buffer with logs is flushed to the fluentd server.


#### Config

- `type` - fluentd | file | console
- `priority` - Highest=`1` Lowest=`Infinity`
    - All logs are redirected to transports with the highest priority.  
    - That means you can effectivelly log messages to more than one transport at the time given that two or more transports share same priority value.
    - Transports with lower priority define fallback log destinations in case main transport(s) (one(s) with the highest priority) experience temporary failure
- `level` - maximum log level of this a transport  
    - each logger possess the following levels (by default):  
           `uncaughtException` | `error` | `warn` | `info` | `verbose`   
    - The levels corresponds to a logger's methods eg. `logger.error()` & `logger.info` etc..
    - When transport's `level` option value equals eg. `error` - only `uncaughException` & `error` events will be logged. Other event will be ignored

#### Logging - usage

```javascript
var logger = require('bi-logger');

//if needed, reinitialize should be called once at app's initialization cycle
//every time `reinitialize` is called, static `bi-logger` module is reconfigured
logger.reinitialize({
    transports: [
        type: 'file',
        dir: 'logs',
        autocreate: true
    ]
});

//somewhere in the app:
var err = new Error('test');
logger.error(err);

logger.error('message', {meta: 'data'});
logger.warn('message', {meta: 'data'});
logger.info('message', {meta: 'data'});
```


#### Custom loggers

For far, we discussed only logging of "fault" events in application's life cycle.  
In case you need to log other types of data, eg. OAuth events, you want to create a new logger:  

```javascript

//create a new logger
var oauthLogger = logger.getOrBuildLogger('oauth', {
    levels: {
        authFailure: 0
        refreshAccess: 1,
    }
});

//use logger
oauthLogger.authFailure({
    accountId: 'id',
    ip: req.ip,
    origin: req.header('origin')
});
```
