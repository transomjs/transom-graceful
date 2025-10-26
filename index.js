"use strict";
const debug = require("debug")("transom:graceful");
const { promisify } = require("es6-promisify");

function TransomGraceful() {
  let isStopping = false;

  const SUCCESS_RESPONSE = JSON.stringify({
    status: "ok",
  });

  const STOPPING_RESPONSE = JSON.stringify({
    status: "error",
    error: "server is shutting down",
  });

  function noopResolve() {
    return Promise.resolve();
  }

  this.initialize = function (server, options) {
    return new Promise(function (resolve, reject) {
      debug("initializing transomGraceful");

      // Combine the API definition section for graceful with the options...
      const gracefulDefn = server.registry.get(
        "transom-config.definition.graceful",
        {}
      );
      options = Object.assign({}, gracefulDefn, options);

      const signals = options.signals || ["SIGINT", "SIGTERM"];
      const timeout = options.timeout || 1000;
      const beforeShutdown = options.beforeShutdown || noopResolve;
      const onSignal = options.onSignal || noopResolve;
      const afterShutdown = options.afterShutdown || noopResolve;
      const serviceUnavailable =
        options.serviceUnavailableWhileStopping === false ? false : true;

      if (serviceUnavailable) {
        // Insert a middleware to stop responding if shutting down.
        server.use(function (req, res, next) {
          if (isStopping) {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(STOPPING_RESPONSE);
            return;
          }
          next();
        });
      }

      function gracefulHealthCheck(healthUrl, check) {
        return function (req, res, next) {
          // checks if the system is healthy, like the db connection
          // is live or an external system / API is available.
          // Health check resolves, if healthy, rejects if not.
          if (isStopping) {
            debug("HealthCheck(%s), server is shutting-down.", healthUrl);
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(STOPPING_RESPONSE);
            return;
          }
          if (typeof check === "function") {
            debug("HealthCheck(%s), checking...", healthUrl);
            return check(server, req, res, next);
          } else {
            debug("HealthCheck(%s), server is running.", healthUrl);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(SUCCESS_RESPONSE);
            return;
          }
        };
      }

      // Add healthcheck routes to the server
      if (
        typeof options.healthChecks === "object" &&
        Object.keys(options.healthChecks).length > 0
      ) {
        Object.keys(options.healthChecks).map((key) => {
          server.get(key, gracefulHealthCheck(key, options.healthChecks[key]));
        });
      }

      // Stop accepting new connections and closes existing, idle connections
      //  (including keep-alives) without killing requests that are in-flight.
      const underlyingServer = server.express || server.restify;
      if (!underlyingServer) {
        throw new Error('No server instance found - cannot set up graceful shutdown');
      }
      
      let httpServer = null;
      let serverStop;
      
      // Handle different server types (Express vs Restify)
      if (typeof underlyingServer.stop === 'function') {
        // This is likely a Restify server - it has a built-in stop method
        serverStop = promisify(underlyingServer.stop).bind(underlyingServer);
      } else if (typeof underlyingServer.close === 'function') {
        // This is likely an HTTP server instance
        serverStop = promisify(underlyingServer.close).bind(underlyingServer);
      } else {
        // This is likely an Express app - we need to capture the HTTP server when listen() is called
        const originalListen = underlyingServer.listen.bind(underlyingServer);
        underlyingServer.listen = function(...args) {
          httpServer = originalListen(...args);
          return httpServer;
        };
        
        serverStop = () => {
          return new Promise((resolve) => {
            if (httpServer && typeof httpServer.close === 'function') {
              httpServer.close(resolve);
            } else {
              resolve();
            }
          });
        };
      }

      function gracefulCleanup(signal) {
        return function () {
          // Cleanup resources like databases or file descriptors.
          if (!isStopping) {
            isStopping = true;
            debug("Server received %s interrupt, starting cleanup.", signal);

            beforeShutdown(server, signal)
              .then(() => serverStop())
              .then(() => onSignal(server, signal))
              .then(() => afterShutdown(server, signal))
              .then(() => {
                signals.forEach((sig) => {
                  debug("Removing %s listeners.", sig);
                  process.removeAllListeners(sig);
                });
                debug("Exit server process %d.", process.pid);
                process.exit(0);
              })
              .catch((err) => {
                debug("Error during shutdown", err);
                process.exit(1);
              });
          }
        };
      }

      signals.forEach((signal) => {
        process.on(signal, gracefulCleanup(signal));
      });

      resolve();
    });
  };
}

module.exports = new TransomGraceful();
