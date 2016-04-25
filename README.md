Logger module
=============

Adds ability to log errors and unhandler exceptions into files located in `/logs/` directory.

How to use
----------

Adding into project (`package.json`):
```json
{
  "dependencies": {
    "bi-logger": "git+ssh://git@webdev-git.czupc.bistudio.com:juraj/logger.git"
  }
}
```

Example use:
```js
    var fileLog = require('bi-logger');
    //...do stuff
    fileLog.error('error');
```

Supported methods
-----------------

**loggerObject.err(_MESSAGE_)**
Customized error log level. Includes a trace with error message. Every call `loggerObject.error(MESSAGE)` will create one row in logs directory in file `error.YY-MM-DD.log` file.
Logs are stored by default in 'logs/' dir in node root app dir.
Path can be overridden using env. path LOGS_DIR like this:
```bash
export LOGS_DIR=/absolute/path/to/custom/logs/dir
```
_Note: env. var should point to absolute location of logs directory.
 Example: /home/user1/dev/my_project01/logs_

[DEPRECATED ]**loggerObject.error(_MESSAGE_)**
Standard error log level handler.


 Module testing
 ---------------
 Tests should be run from command line by runner (from module directory):
 ```bash
 ./tests.sh
 ```



