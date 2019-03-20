# transom-graceful
Add graceful shutdown to your server-side Transomjs APIs.

[![Build Status](https://travis-ci.org/transomjs/transom-graceful.svg?branch=master)](https://travis-ci.org/transomjs/transom-graceful)


## Installation

```bash
$ npm install transom-graceful
```

## What are Readiness & Liveness Probes?
Liveness Probes tell Kubernetes your application is still alive. 
If the liveness probes fail, Kubernetes will kill the pod and bring up a new one.

Readiness Probes tell Kubernetes that your pod is ready to receive traffic.


## How to use health probes
In the most general sense, make your probes as dumb as possible, simply returning a 200 / success response. Don't make them especially onerous as they get called repeatedly while your application is running.

During app startup, a readiness probe can wait until the database connection pool is created before returning success, if the database isn't up, your app instance will not be able to service client requests.

A liveness probe should only return a 500 / failure response if restarting the instance (killing and replacing) will fix the problem. Working around a memory leak seems like the most likely scenario here. Do not return a failure response if your database is unavailable as it will result in high CPU as your containers are constantly restarted.


E.g.
If your database is down and all the instances of your API are returning not-ready, the user of your app will get a 503 / 500
error indicating that your app is unavailable, when you could have handled it gracefully some other way. 



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
