#!/bin/bash
set -e
set -x
projectPath=$PWD

testLogsDir=$projectPath/tests/logs

export LOGS_DIR=$testLogsDir
machine=$(hostname)

if [[ $PWD != $projectPath ]]; then
    cd $projectPath
fi
istanbul cover node_modules/mocha/bin/_mocha -- --recursive --ui tdd -R spec tests
