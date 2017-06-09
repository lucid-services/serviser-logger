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
        it('should setup fluentd logger trainsport as primary gateway', function() {
            
        });

        it('should setup fallback logger for each transport', function() {
            
        });
    });

    describe('logger.getOrBuildLogger', function() {
        
    });

    describe('logger._buildTransport', function() {
        
    });
});
