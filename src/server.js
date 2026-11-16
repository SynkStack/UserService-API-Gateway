'use strict';

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { createServices } = require('./services');
const { createApp } = require('./app');

const config = loadConfig();
const logger = createLogger({ level: config.logLevel });
const app = createApp({ config, logger, services: createServices() });

const server = app.listen(config.port, () => {
  logger.info('gateway started', { port: server.address().port, environment: config.env });
});

// Stop cleanly on Ctrl+C (SIGINT) or when a platform sends SIGTERM.
function shutdown(signal) {
  logger.info('shutting down', { signal });
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
