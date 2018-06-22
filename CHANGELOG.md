## 2.0.2

* [FIXED] global variable leak due to a typo

## 2.0.1

* [FIXED] option determining whether json data written to the file (via DailyRotateFile transport) should be pretty printed or not, should be configurable

## 2.0.0

* [ADDED] support for `Error.prototype.toLogger`
* [ADDED] Error constructor name to logged json object

## 2.0.0-alpha

* [REMOVED] custom `logger.err` method
* [ADDED] support for `fluentd` & `console` transports
* [ADDED] `getOrBuildLogger` & `reinitialize` public methods

## 1.0.1

* [FIXED] don't overwrite error uids with newly generated uid
