var winston = require('winston');
var exception = require('winston').exception;
var path = require('path');
var fs = require('fs');
var errorDebug = require('debug')('logger-error')


winston.emitErrs = false;

"use strict";
var Logger = function () {
    //consts
    this.LOGS_DIR_NAME = 'logs';

    //defaults
    this._logsDirPathName = process.cwd() + path.sep + this.LOGS_DIR_NAME + path.sep;

    this._transports = [];

    if (process.env.LOGS_DIR != undefined && process.env.LOGS_DIR != null && process.env.LOGS_DIR.length > 0) {
        this._logsDirPathName = process.env.LOGS_DIR;
        if (!process.env.LOGS_DIR.endsWith(path.sep)) {
            this._logsDirPathName += path.sep;
        }
    }
}

/**
 *
 * @param level
 * @param fileNamePrefix
 * @returns {exports.DailyRotateFile}
 * @private
 */
Logger.prototype._getFileTransport = function (level, fileNamePrefix, fileExtension) {
    var transport = new winston.transports.DailyRotateFile({
        level: level,
        filename: this._logsDirPathName + fileNamePrefix,
        datePattern: '.yy-MM-dd.' + fileExtension,
        message: '%l $e $m',
        subject: '%l $e $m',
        region: 'eu-west-1',
        handleException: false,
        tailable: true,
        prettyPrint: true,
        json: false,
        maxSize: 5242880, //5mb
        maxFiles: 2,
        colorize: false
    });
    this._transports[ fileNamePrefix ] = transport;
    return transport;
}

/**
 * Returns instance of winston logger
 * @returns winston.prototype
 */
Logger.prototype.getLoggerInstance = function () {
    var modifiedLogg = {};
    var self = this
    fs.stat(self._logsDirPathName, function (err, stat) {
        if (stat !== undefined && stat.isDirectory()) {
            return;
        }
        fs.mkdir(self._logsDirPathName, function (err) {
            if (err !== null) {
                console.log('Logs directory ' + self._logsDirPathName + ' does not exists and can not be created. Logs will be disabled! (Error: ' + err.message + ')')
            }
        })
    })

    //TODO: too much coupled with winston - but not important right now...
    var fileLogger = new winston.Logger({
        transports: [
            this._getFileTransport('error', 'error', 'log')
        ],
        exitOnError: true
    });

    fileLogger.handleExceptions(this._getFileTransport('error', 'exception', 'json'));

    fileLogger.extend(modifiedLogg);

    modifiedLogg.err = function (error, options) {
        modifiedLogg.error('error', error, options);
        errorDebug(error, options)
    };

    return modifiedLogg;
}

module.exports = new Logger();
