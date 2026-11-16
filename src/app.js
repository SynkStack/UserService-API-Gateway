'use strict';

const express = require('express');
const { registerRoutes } = require('./routes');
const { requestId } = require('./middleware/requestId');
const { requestLogger } = require('./middleware/requestLogger');
const { notFound } = require('./middleware/notFound');
const { normalizeUpstreamError } = require('./middleware/normalizeUpstreamError');
const { createErrorHandler } = require('./middleware/errorHandler');

// Builds the Express app without starting a server, so tests can use it directly.
function createApp({ config, logger, services }) {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(requestLogger(logger));
  app.use(express.json({ limit: '10kb' }));

  registerRoutes(app, { config, services });

  app.use(notFound);
  app.use(normalizeUpstreamError);
  app.use(createErrorHandler({ logger }));

  return app;
}

module.exports = { createApp };
