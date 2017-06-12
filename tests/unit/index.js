var fs        = require('fs');
var path      = require('path');
var sinon     = require('sinon');
var chai      = require('chai');
var sinonChai = require("sinon-chai");
var tmp       = require('tmp');

var logger = require('../../index.js');

var expect = chai.expect;

const ROOT = path.resolve(__dirname + '/../../');

chai.use(sinonChai);
chai.should();

describe('logger', function() {
    before(function() {
        tmp.setGracefulCleanup();
        this.tmpDir = tmp.dirSync({unsafeCleanup: true});

        this.clearFolder = function clearFolder(dir) {
            var files = fs.readdirSync(dir);

            for (const file of files) {
                fs.unlinkSync(path.join(dir, file));
            }
        };

        this.removeMochaListeners = function() {
            var listeners = process.listeners('uncaughtException');
            var mochaListener = listeners.pop();
            process.removeListener('uncaughtException', mochaListener);

            return function() {
                process.addListener('uncaughtException', mochaListener);
            };
        };

        this.isFile = function isFile(file) {
            //throws if file does not exist
            try {
                var stat = fs.statSync(file);
                if (stat.isDirectory()) {
                    return false;
                }
                return true;
            } catch(e) {
                if (e.code == 'ENOENT') {
                    return false;
                }

                throw e;
            }
        };

        this.isDir = function isDir(dir) {
            var stat;
            try {
                stat = fs.statSync(dir);

                if (stat && !stat.isDirectory()) {
                    return false;
                }

                return true;
            } catch(e) {
                if (e.code == 'ENOENT') {
                    return false;
                }

                throw e;
            }
        };
    });

    after(function() {
        this.clearFolder(path.resolve(ROOT + '/logs'));
    });

    describe('default configuration', function() {
        it('should create `logs` dirrectory in project root folder', function() {
            var logsPath = ROOT + '/logs';

            if (!this.isDir(logsPath)) {
                throw new Error(`${logsPath} is not a dirrectory`);
            }
        });

        it('should log an Error to $Project/logs/fault.${date}.json file', function(done) {
            var self = this;
            var logsPath = ROOT + '/logs';
            this.clearFolder(logsPath);

            logger.error('message', function(err) {
                if (err) {
                    return done(err);
                }

                //throws if file does not exist
                var logFilePath = logsPath + `/fault.${self.dateToISOString(new Date)}.json`;
                if (!self.isFile(logFilePath)) {
                    return done(new Error(`${logFilePath} is expected to be a file`));
                }
                self.clearFolder(logsPath);
                return done();
            })
        });

        it('should log uncaughtException and exit with 1', function(done) {
            var self = this;
            var err = new Error('tets err');
            var loggerSpy = sinon.spy(logger, 'uncaughtException');
            var restoreMocha = this.removeMochaListeners();
            var exitStub = sinon.stub(process, 'exit');

            process.once('uncaughtException', function(e) {
                restoreMocha();

                process.nextTick(function() {
                    exitStub.should.have.been.calledWith(1);
                    loggerSpy.should.have.been.calledOnce;
                    loggerSpy.should.have.been.calledWith(err);

                    loggerSpy.restore();
                    process.exit.restore();

                    if (e !== err) {
                        return done(e);
                    } else {
                        return done();
                    }
                });
            });

            process.nextTick(function() {
                throw err;
            })
        });
    });

    describe('logger.reinitialize', function() {

        describe(`fluentd as the only logger transport`, function() {
            before(function() {
                logger.reinitialize({
                    transports: [
                        {
                            type: 'fluentd',
                            origin: 'bi-some-service',
                            priority: 1,
                            host: '127.0.0.1',
                            port: 24224,
                        }
                    ]
                });
            });

            it(`should setup fluentd logger transport as primary gateway`, function() {

                logger.default.transports.should.have.property('fluent')
                    .that.is.an.instanceof(logger.Transport);
            });

            it('should redirect fluent transport error to console', function() {

                logger.default.transports.fluent.fallbackLogger.should.be.equal(console);
                var err = new Error('test error');
                var consoleErrorStub = sinon.stub(console, 'error');

                try  {
                    logger.default.transports.fluent.emit('error', err);

                    consoleErrorStub.should.have.been.calledOnce;
                    consoleErrorStub.should.have.been.calledWith(err);
                    consoleErrorStub.restore();
                } catch(e) {
                    consoleErrorStub.restore();
                    throw e;
                }
            });
        });

        describe(`fluentd as primary logger with file logger as fallback`, function() {
            before(function() {
                this.logsDir =  path.resolve(this.tmpDir.name + '/logs');

                logger.reinitialize({
                    transports: [
                        {
                            type: 'fluentd',
                            origin: 'bi-some-service',
                            priority: 1,
                            host: '127.0.0.1',
                            port: 24224,
                        },
                        {
                            type: 'file',
                            priority: 2,
                            dir: this.logsDir,
                            autocreate: true
                        }
                    ]
                });
            });

            it(`should setup fluentd logger transport as primary gateway`, function() {

                logger.default.transports.should.have.property('fluent')
                    .that.is.an.instanceof(logger.Transport);
            });

            it('should redirect fluent transport failure reason (error) to the file transport', function(done) {

                var self = this;
                this.clearFolder(this.logsDir);
                logger.default.transports.fluent.fallbackLogger.should.be.instanceof(logger.Logger);
                logger.default.transports.fluent.fallbackLogger.transports.should.have.property('dailyRotateFile')
                .that.is.instanceof(logger.Transport);

                var err = new Error('test error');
                var consoleErrorSpy = sinon.stub(console, 'error');

                logger.default.transports.fluent.emit('error', err);
                consoleErrorSpy.should.have.callCount(0);
                consoleErrorSpy.restore();

                setTimeout(function() {
                    var logFilePath = self.logsDir + `/fault.${self.dateToISOString(new Date)}.json`;
                    if (!self.isFile(logFilePath)) {
                        return done(new Error(`${logFilePath} is expected to be a file`));
                    }
                    self.clearFolder(self.logsDir);
                    return done();
                }, 50);
            });
        });

        describe(`fluentd as primary logger with file & console loggers as fallbacks`, function() {
            before(function() {
                logger.reinitialize({
                    transports: [
                        {
                            type: 'file',
                            priority: 2,
                            dir: 'logs'
                        },
                        {
                            type: 'console',
                            priority: 3
                        },
                        {
                            type: 'fluentd',
                            origin: 'bi-some-service',
                            priority: 1,
                            host: '127.0.0.1',
                            port: 24224,
                        }
                    ]
                });
            });

            it(`should setup fluentd logger transport as primary gateway`, function() {

                logger.default.transports.should.have.property('fluent')
                    .that.is.an.instanceof(logger.Transport);
            });

            it('should have fallback loggers defined', function() {
                logger.default.transports.fluent.fallbackLogger.should.be.instanceof(logger.Logger);
                logger.default.transports.fluent.fallbackLogger.transports.should.have.property('dailyRotateFile')
                .that.is.instanceof(logger.Transport);

                logger.default.transports.fluent.fallbackLogger.transports.dailyRotateFile.fallbackLogger.should.be.instanceof(logger.Logger);
                logger.default.transports.fluent.fallbackLogger.transports.dailyRotateFile.fallbackLogger.transports.should.have.property('console')
                .that.is.instanceof(logger.Transport);
            });
        });
    });

    describe('logger.getOrBuildLogger', function() {
        before(function() {
            logger.reinitialize({
                transports: [
                    {
                        type: 'file',
                        priority: 2,
                        dir: 'logs'
                    },
                    {
                        type: 'console',
                        priority: 3
                    },
                    {
                        type: 'fluentd',
                        origin: 'bi-some-service',
                        priority: 1,
                        host: '127.0.0.1',
                        port: 24224,
                    }
                ]
            });
        });

        it('should return new Logger object', function() {
            logger.getOrBuildLogger('custom').should.be.instanceof(logger.Logger);
        });

        it('should not create new Logger if an one already exists under the same name', function() {
            logger.getOrBuildLogger('custom2').should.be.instanceof(logger.Logger);
            logger.getOrBuildLogger('custom2').should.be.equal(logger.loggers.loggers['custom2']);
        });

        it('should return new Logger with fluentd transport', function() {
            var customLogger = logger.getOrBuildLogger('custom3');

            customLogger.transports.should.have.property('fluent').that.is.instanceof(logger.Transport);
            Object.keys(customLogger.transports).should.have.lengthOf(1);
        });

        it('should return new Logger with file transport', function() {
            var customLogger = logger.getOrBuildLogger('custom4', {type: 'file'});

            customLogger.transports.should.have.property('dailyRotateFile').that.is.instanceof(logger.Transport);
            Object.keys(customLogger.transports).should.have.lengthOf(1);
        });

        it('should trow an Error if we try to build new Logger with unknown trasport type', function() {
            expect(function() {
                logger.getOrBuildLogger('custom5', {type: 'unknown'});
            }).to.throw(Error);
        });
    });
});
