/*
 * bi-logger: file logger public api
 *
 * (C) 2016 Bohemia Interactive
 *
 */
var Logger = require('./lib/logger');
module.exports = new Logger().getInstance();
