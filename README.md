# transom-graceful
Add graceful shutdown to your server-side Transomjs APIs.

[![Build Status](https://travis-ci.org/transomjs/transom-graceful.svg?branch=master)](https://travis-ci.org/transomjs/transom-graceful)


## Installation

```bash
$ npm install transom-graceful
```

## Usage
```javascript
const Transom = require('@transomjs/transom-core');
const transomGraceful = require('@transomjs/transom-graceful');

const transom = new Transom();

// Add T-Graceful first because it adds 
// shutdown checking middleware to the server!
// Configuration is completely optional
transom.configure(transomGraceful, {
    timeout: 5000,
    signals = ['SIGINT', 'SIGTERM'],
	beforeShutdown: (server) => {
		return new Promise((resolve, reject) => {
			console.log('%s is going down, do some cleanup!', server.name);
			// artificial delay
			setTimeout(() => {
				console.log('server is done beforeShutdown!');
				resolve();
			}, 5000);
		});
	},
	onSignal: (server) => {
		return new Promise((resolve, reject) => {
			console.log("%s says onSignal!", server.name);
			// artificial delay
			setTimeout(() => {
				console.log('server is done onSignal!');
				resolve();
			}, 5000);
		});
	},
	afterShutdown: (server) => {
		return new Promise((resolve, reject) => {
			console.log("%s says afterShutdown!", server.name);
			// artificial delay
			setTimeout(() => {
				console.log('server is done afterShutdown!');
				resolve();
			}, 5000);
		});
	},
	healthChecks: {
		"/healthcheck": function (server, req, res, next) {
            // Get fancy & make sure your database is writeable.
			console.log(server.name + ' is all good!');
			res.json({
				status: 'ok'
			});
			next();
		}
	}
});
```
