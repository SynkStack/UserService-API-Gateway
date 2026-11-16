'use strict';

const { createHealthRouter } = require('./health');
const { createUsersRouter } = require('./users');
const { createAuthRouter } = require('./auth');
const { createNotificationsRouter } = require('./notifications');
const { createPlatformRouter } = require('./platform');
const { simulateUpstreamFailure } = require('../middleware/simulateUpstreamFailure');

// Central route registration: the one place that shows every URL the gateway serves.
function registerRoutes(app, { config, services }) {
  const { upstream } = services;

  app.use(createHealthRouter());

  app.use('/api', simulateUpstreamFailure(config));
  app.use('/api/users', createUsersRouter({ upstream }));
  app.use('/api/auth', createAuthRouter({ upstream }));
  app.use('/api/notifications', createNotificationsRouter({ upstream }));
  app.use('/api/platform', createPlatformRouter({ config, upstream }));
}

module.exports = { registerRoutes };
