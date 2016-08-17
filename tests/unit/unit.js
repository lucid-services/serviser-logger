var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var process = require('process');

//defined as env. var LOGS_DIR in tests.sh
var logsDir = process.cwd() + '/logs';

suite('Routes', function () {

    setup(function (done) {
        if (fs.existsSync(logsDir)) {
            logFiles = fs.readdirSync(logsDir);
            for (var i=0;i<logFiles.length; i++) {
                fs.unlinkSync(logsDir + path.sep + logFiles[i]);
            }
            fs.rmdirSync(logsDir);
        }
        try {
            delete require.cache[require.resolve('../index')]
        } catch (e) {
            //
        }
        done();
    });

    test('create logs dir if it does not exists', function(done){
        fs.stat(logsDir, function(err, stats) {
            if (stats !== undefined) {
                return done(new Error('Logs dir ' + logsDir + ' should not exists!'))
            }

            var filleLog = require('../../lib/logger').getLoggerInstance();
            setTimeout(function() {
                fs.stat(logsDir, function(err, stats) {
                    if (err !== null) {
                        return done(err)
                    }
                    assert.isTrue(stats.isDirectory(), 'Logs dir ' + logsDir + ' does not exists!');
                    done();
                })
            }, 100)
        })
    });

    test('logs dir already exists', function(done){
        fs.mkdir(logsDir, function(err) {
            setTimeout(function() {
                var filleLog = require('../../lib/logger').getLoggerInstance();
            }, 200)
            done()
        })
    })

    test('return proper transport', function(done){
        var isWin = /^win/.test(process.platform);
        
        var fileLog = require('../../lib/logger');
        var transport = fileLog._getFileTransport('error', 'pretest_', 'tst');
        assert.equal(transport.level, 'error');
        assert.equal(transport.filename, 'pretest_');
        assert.equal(transport._basename, 'pretest_');
        if (isWin) {
            assert.equal(transport.dirname, logsDir.replace(/\//g, '\\'));
        } else {
            assert.equal(transport.dirname, logsDir.replace(/\\/g, '/'));
        }
        assert.equal(transport.datePattern, '.yy-MM-dd.tst');
        done();
    });
    
    test('do log does not produce error', function(done){
        var FileLog = require('../../lib/logger');
        FileLog.getLoggerInstance().err('TEST1');
        assert.include(FileLog._transports['error']._buffer[0][0], 'TEST1');
        done();
    });
});