'use strict';

const { createApp } = require('../../src/app');
const { createLogger } = require('../../src/logger');
const { createServices } = require('../../src/services');
const { loadConfig } = require('../../src/config');

// Builds a brand-new gateway for each test:
//  - fresh in-memory mocked services (no data leaks between tests)
//  - a logger that stores log lines in an array instead of printing them
function createTestApp(envOverrides = {}) {
  const config = loadConfig({ NODE_ENV: 'test', ...envOverrides });
  const logLines = [];
  const logger = createLogger({ level: 'debug', write: (line) => logLines.push(JSON.parse(line)) });
  const services = createServices();
  const app = createApp({ config, logger, services });

  return { app, services, logLines, config };
}

module.exports = { createTestApp };
