var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

//defined as env. var LOGS_DIR in tests.sh
var logsDir = process.cwd() + '/tests/logs';

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
        assert.isFalse(fs.existsSync(logsDir), 'Logs dir ' + logsDir + ' should not exists!');
        var fileLog = require('../index').getInstance();
        assert.isTrue(fs.existsSync(logsDir), 'Logs dir ' + logsDir + ' should exists!');
        done();
    });

    test('return proper transport', function(done){
        var fileLog = require('../index');
        var transport = fileLog._getFileTransport('error', 'pretest_', 'tst');
        assert.equal(transport.level, 'error');
        assert.equal(transport.filename, 'pretest_');
        assert.equal(transport._basename, 'pretest_');
        assert.equal(transport.dirname, logsDir.replace(/\\/g, '/'));
        assert.equal(transport.datePattern, '.yy-MM-dd.tst');
        done();
    });

    test('do log does not produce error', function(done){
        var FileLog = require('../index');
        var logTransports = FileLog.transports;
        FileLog.getInstance().err('TEST1');
        FileLog.getInstance().err('TEST2');
        assert.equal(logTransports['error']._eventsCount, 2);
        done();
    });
});