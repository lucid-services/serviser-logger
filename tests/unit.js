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
        var fileLog = require('../index');
        assert.isTrue(fs.existsSync(logsDir), 'Logs dir ' + logsDir + ' should exists!');
        done();
    });

    test('do log does not produce error', function(done){
        var fileLog = require('../index');
        fileLog.error('TEST');
        done();
    });
});