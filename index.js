var fs              = require('fs');
var path            = require('path');
var _               = require('lodash');
var winston         = require('winston');
var fluentd          = require('fluent-logger');
var DailyRotateFile = require('winston-daily-rotate-file');

var FluentTransport = fluentd.support.winstonTransport();

var logger = Object.create(winston);

logger._defaultLevels = {
    uncaughtException: 0,
    error   : 1,
    warn    : 2,
    info    : 3,
    verbose : 4
};

module.exports = logger;

/**
 * overwrites default settings of the logger module, setups logging transports
 * according to provided options object
 *
 * @public
 * @param {Object}        options
 * @param {Boolean}       [options.exitOnError=true]
 * @param {Array<Object>} options.transports
 * @param {String}        options.transports[].type - console|file|fluentd
 * @param {String}        [options.transports[].level] - maximum allowed level logging restriction
 * @param {String}        [options.transports[].priority] - 1 = highest priority,  determines whether this transport will be selected as default logging solution for 'fault' reports
 */
logger.reinitialize = function reinitialize(options) {
    options = logger._sanitizeOptions(options);
    logger._options = options;

    if (Array.isArray(options.transports)) {

        var defaultTransports = logger._buildPrimaryTransports('fault');

        logger.configure({
            transports: defaultTransports,
            rewriters: [errorTraceFormater],
            filters: [errorMessageSanitizer]
        });
        logger.setLevels(logger._defaultLevels);
    }

    if (typeof options.exitOnError === 'boolean') {
        logger.exitOnError = options.exitOnError;
    }
};

/**
 * @param {String} tag
 * @param {Object} [transportOptions] - ovewrites defaults
 * @return {Array<Transport>}
 */
logger._buildPrimaryTransports = function _buildPrimaryTransports(tag, transportOptions) {
    if (typeof tag !== 'string' || !tag) {
        throw new Error('`tag` argument must be valid string value');
    }

    var out = [];
    var transports = (logger._options && logger._options.transports) || [];
    var index = 0;
    var tranport;

    //trasnports are expected to be sorted by now (higher priority comes first)
    while( _.isPlainObject(transports[index])
        && transports[index].priority == transports[0].priority
    ) {
        var opt = _.assign({}, transports[index], transportOptions || {});
        transport = logger._buildTransport(tag, opt, index);
        out.push(transport);
        index++;
    }

    return out;
};

/**
 * @private
 * @param {Object} [options]
 * return {Object}
 */
logger._sanitizeOptions = function(options) {
    options = _.cloneDeep(options || {});
    var defaults = {
        exitOnError: true,
        transports: []
    };
    opitons = _.assign(defaults, options);

    for (var i = 0, transport = null; i < options.transports.length; i++) {
        transport = options.transports[i];

        if (typeof transport !== 'object' || transport === null) {
            source.splice(index, 1);
            continue;
        }

        if (   typeof transport.priority !== 'number'
            || parseInt(transport.priority) === NaN
        ) {
            transport.priority = Infinity;
        }

    }

    options.transports.sort(function(a, b) {
        if (a.priority < b.priority) {
            return -1;
        } else if (a.priority > b.priority) {
            return 1;
        } else {
            if (a.type == 'file' && b.type == 'fluentd') {
                return 1;
            } else if (a.type == 'fluentd' && b.type == 'file') {
                return -1;
            } else {
                return 0;
            }
        }

    });

    return options;
};

/**
 * The returned fallback logger implemets 'error' & `info` method
 *
 * @private
 * @param {String}  tag - the tag of a transport the fallback logger should be builded for
 * @param {Integer} index - _options.transports index of the transport a fallback logger should be generated for
 * @return {Logger|console}
 */
logger._getOrBuildFallbackLogger = function getOrBuildFallbackLogger(tag, index) {
    if (index == -1 || logger._options.transports.length-1 <= index) {
        return console;
    } else {
        var newLogger = logger.loggers.add('fallback-logger-'+index, {
            transports: [
                logger._buildTransport(tag, logger._options.transports[index+1], index+1)
            ]
        });

        newLogger.emitErrs = false;

        return newLogger;
    }
};

/**
 * @public
 * @param {String} name - user defined logger name (key)
 * @param {Object} [createOptions] - used when a logger with the name does not exist yet and is to be created
 * @param {String} [createOptions.type] - file|fluentd|console
 * @return {Logger}
 */
logger.getOrBuildLogger = function getOrBuildLogger(name, createOptions) {
    //logger.get | logger.add is the same function so it must be handled this way
    if (logger.loggers.loggers[name]) {
        return logger.loggers.get(name);
    }

    var options = {transports: []};
    var index, transportOptions;
    createOptions = createOptions || {};

    if (typeof createOptions.type === 'string' && createOptions.type) {
        index = _.findIndex(logger._options.transports, function(val) {
            return val.type === createOptions.type;
        });

        if (index === -1) {
            throw new Error(`Transport: ${createOptions.type} not found`);
        }
        transportOptions = _.cloneDeep(logger._options.transports[index]);

        if (createOptions) {
            _.assign(transportOptions, createOptions);
        }

        options.transports.push(logger._buildTransport(name, transportOptions, index));
    } else {
        options.transports = logger._buildPrimaryTransports(name, createOptions);
    }

    var newLogger = logger.loggers.add(name, options);

    newLogger.emitErrs = false;

    if (createOptions && createOptions.levels) {
        newLogger.setLevels(_.assign({}, createOptions.levels));
    }

    return newLogger;

};

/**
 * @private
 * @param {String} tag
 * @param {Object} options - transport options
 * @param {String} options.type - currently supported: file|fluentd
 * @param {Integer} [options.transportIndex]
 * @return {Transport}
 */
logger._buildTransport = function buildTransport(tag, options, transportIndex) {
    options = options || {};
    var transport;

    if (transportIndex === undefined || transportIndex === null) {
        transportIndex = -1;
    }

    switch (options.type) {
        case 'fluentd':
            var fallbackLogger = logger._getOrBuildFallbackLogger(tag, transportIndex);

            transport = logger.buildFluentTransport(tag, _.assign({
                internalLogger: fallbackLogger
            }, options));
            break;
        case 'file':
            transport = logger.buildDailyFileTransport(tag, options);
            break;
        case 'console':
            transport = new winston.transports.Console(options);
            break;
        default:
            throw new Error('Unsupported Transport type: ' + options.type);
    }

    return transport;
};

/**
 * @public
 * @param {String}  filename
 * @param {Object}  options
 * @param {String}  options.dir - logs dirrectory
 * @param {String}  [options.level] - maximum allowed level logging restriction
 * @param {Integer} [option.priority=Infinity] - 1 = highest priority
 * @param {Boolean} [options.autocreate=true] - whether to automatically create destination dirrectory if it does not exist
 *
 * @return {Transport}
 */
logger.buildDailyFileTransport = function(filename, options) {
    options = options || {};
    var destination;

    if (!options.dir) {
        throw new Error('`dir` option is required. (Logs file system location)')
    } else if (path.isAbsolute(options.dir)) {
        destination = path.resolve(options.dir + path.sep);
    } else {
        destination = path.resolve(process.cwd() + path.sep + options.dir + path.sep);
    }

    if (!filename || typeof filename !== 'string') {
        throw new Error('`filename` argument must be valid string');
    }

    var transport =  new DailyRotateFile({
        level       : options.level,
        filename    : destination + path.sep + filename,
        datePattern : '.yy-MM-dd.json',
        message     : '%l $e $m',
        subject     : '%l $e $m',
        region      : 'eu-west-1',
        tailable    : true,
        prettyPrint : true,
        json        : true,
        maxSize     : 5242880, //5mb
        maxFiles    : 2,
        colorize    : false,
        handleException : false
    });

    var transportOptIndex = logger._options.transports.indexOf(options);
    var fallbackLogger = logger._getOrBuildFallbackLogger(filename, transportOptIndex);

    transport.fallbackLogger = fallbackLogger;

    transport.on('error', function(err) {
        if (err instanceof Error) {
            fallbackLogger.error(err.message, err);
        }
    });

    if (options.autocreate === undefined || options.autocreate === true) {
        logger._ensureFSPathExists(destination, transport);
    }

    return transport;
};

/**
 * @public
 * @param {String} tagPostfix
 * @param {Object}  options
 * @param {String}  options.host
 * @param {Integer} options.port
 * @param {String}  [options.origin] - logs source identifier (tag)
 * @param {String}  [options.level] - maximum allowed level logging restriction
 * @param {Integer} [options.reconnectInterval]
 * @param {Integer} [options.timeout]
 * @param {Integer} [options.priority] - determines whether this transport will be selected as default logging solution for 'fault' reports
 * @param {String}  [options.internalLogger=console]
 *
 * @return {Transport}
 */
logger.buildFluentTransport = function buildFluentTransport(tagPostfix, options) {
    options = options || {};
    var tag = '';

    if (!tagPostfix || typeof tagPostfix !== 'string') {
        throw new Error('`tag` - the first argument must be valid string');
    }

    switch (process.env.NODE_ENV) {
        case 'development':
            tag += 'webdev-local';
            break;
        case 'develop':
            tag += 'webdev-dev';
            break;
        case 'preprod':
            tag += 'webdev-preprod';
            break;
        case 'production':
            tag += 'webdev-prod';
            break;
        default:
            tag += 'webdev-local';
    }

    tag += '.' + (options.origin || ''); // eg. 'webdev-local.bi-depot
    tag += '.' + tagPostfix; // eg. 'webdev-local.bi-depot.fault

    var transport =  new FluentTransport(tag, {
        internalLogger    : options.internalLogger || console,
        host              : options.host,
        port              : options.port,
        timeout           : options.timeout,
        reconnectInterval : options.reconnectInterval
    });
    transport.level = options.level;
    transport.sender._setupErrorHandler();
    transport.sender.on('connect', function() {
        transport.sender._flushSendQueue();
    });

    transport.fallbackLogger = tranport.sender.internalLogger;
    transport.on('error', function(err) {
        this.sender.internalLogger.error(err.message, err);
    });

    return transport;
};

/**
 * @private
 * @param {String} path
 * @param {Transport} transport - file transport
 */
logger._ensureFSPathExists = function(path, transport) {
    var stat;
    try {
        stat = fs.statSync(path);

        if (stat && !stat.isDirectory()) {
            throw new Error(`${path} already exists and is NOT a dirrectory. Can not create log destination`);
        }
    } catch(e) {
        if (e.code == 'ENOENT') {
            return fs.mkdirSync(path);
        }

        throw e;
    }
};

//set default logger
logger.reinitialize({
    transports: [
        {
            type: 'file',
            priority: 1,
            dir: path.resolve(process.cwd() + '/logs/'),
            level: 'error',
            autocreate: true
        }
    ]
});

//handle uncaughtExceptions
process.on('uncaughtException', function(e) {
    logger.uncaughtException(e, function(err) {

        if (err) {
            console.error(err);
        }

        if (logger.exitOnError) {
            process.exit(1);
        }
    });
});


/**
 * @param {String} level
 * @param {String} msg
 * @param {Object} meta
 *
 * @return {undefined}
 */
function errorMessageSanitizer(level, msg, meta) {
    if (!msg && meta.message && meta.trace) { //we are dealing with an Error log
        msg = meta.message;
        delete meta.message;
    }
    return msg;
}

/**
 * @param {String} level
 * @param {String} msg
 * @param {Object} meta
 */
function errorTraceFormater(level, msg, meta) {
    var out;
    if (meta instanceof Error) {
        if (typeof meta.toJSON === 'function') {
            out = meta.toJSON();
        }
        out = out || {};
        out.trace = winston.exception.getTrace(meta);
        out.message = meta.message;
    }

    return out || meta;
}
