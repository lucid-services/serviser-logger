var winston = require('winston');
var exception = require('winston').exception;
var path = require('path');
var fs = require('fs');

winston.emitErrs = false;

"use strict";
var Logger = function () {
    //consts
    this.LOGS_DIR_NAME = 'logs';

    //defaults
    this.logsDirPathName = process.cwd() + path.sep + this.LOGS_DIR_NAME + path.sep;

    if (process.env.LOGS_DIR != undefined && process.env.LOGS_DIR != null && process.env.LOGS_DIR.length > 0) {
        this.logsDirPathName = process.env.LOGS_DIR;
        if (!process.env.LOGS_DIR.endsWith(path.sep)) {
            this.logsDirPathName += path.sep;
        }
    }
}

/**
 *
 * @param level
 * @param fileNamePostfix
 * @returns {exports.DailyRotateFile}
 * @private
 */
Logger.prototype._getFileTransport = function (level, fileNamePostfix) {
    return new winston.transports.DailyRotateFile({
        level: level,
        filename: this.logsDirPathName + fileNamePostfix,
        datePattern: '.yy-MM-dd.json',
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
    })
}

/**
 * Returns instance of winston logger
 * @returns winston
 */
Logger.prototype.getInstance = function () {
    var modifiedLogg = {};

    if (!fs.existsSync(this.logsDirPathName)) {
        fs.mkdirSync(this.logsDirPathName);
        if (!fs.existsSync(this.logsDirPathName)) {
            console.log('Logs directory ' + this.logsDirPathName + ' does not exists and can not be created. Logs will be disabled!')
        }
    }

    var fileLogger = new winston.Logger({
        transports: [
            this._getFileTransport('error', 'error')
        ],
        exitOnError: false
    });

    fileLogger.handleExceptions(this._getFileTransport('error', 'exception'));

    fileLogger.extend(modifiedLogg);

    modifiedLogg.err = function (error, options) {
        var options2 = {};
        if (process.domain) {
            options2.ID = process.domain.id;
        } else {
            process.errUUID = Date.now() + Math.random();
            options2.ID = process.errUUID;
        }

        for (var i in options) options2[i] = options[i];

        if (error instanceof Error) {
            options2.TRACE = exception.getTrace(error);
        }
        modifiedLogg.error('error', error, options2);
    };

    return modifiedLogg;
}

module.exports = new Logger().getInstance();
