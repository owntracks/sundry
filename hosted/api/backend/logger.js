var config = require('../config.json');
var winston = require('winston');

var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({colorize:true}), new (winston.transports.File)({filename: 'hosted.log', silent: true, tailable: true, zippedArchive: true,  }) ] });

winston.loggers.add('mail', {
  console: {
    level: 'silly',
    colorize: false,
    label: 'mail'
  },
  file: {
    filename: config.logs + '/hosted.mail', 
    tailable: true, 
    zippedArchive: true
  }
});

winston.loggers.add('default', {
  console: {
    level: 'silly',
    colorize: false,
    label: 'default'
  },
  file: {
    filename: config.logs + '/hosted.log',
    tailable: true,
    zippedArchive: true,
    level: 'silly',
    name: 'default'
  },
  file: {
    filename: config.logs + '/hosted.error',
    tailable: true,
    zippedArchive: true,
    level: 'error',
    name: 'default-error'
  }

});

winston.loggers.add('action', {
  console: {
    level: 'silly',
    colorize: false,
    label: 'actions'
  },
  file: {
    filename: config.logs + '/hosted.actions',
    tailable: true,
    zippedArchive: true
  }



});

winston.loggers.add('request', {
  console: {
    level: 'silly',
    colorize: false,
    label: 'request'
  },
  file: {
    filename: config.logs + '/hosted.request',
    tailable: true,
    zippedArchive: true
  }
});


module.exports = function(app) {
	app.logger = winston.loggers.get('default')
        app.logError = winston.loggers.get('default').error;
        app.log = winston.loggers.get('default').info;
        app.logDebug = winston.loggers.get('default').debug;
        app.logWarning = winston.loggers.get('default').warn;
        app.logMail = winston.loggers.get('mail').info;
        app.logAction = winston.loggers.get('action').info;

        app.use(require('winston-request-logger').create(winston.loggers.get('request')));
}

