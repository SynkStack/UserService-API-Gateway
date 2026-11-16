'use strict';

const { createUsersService } = require('./mocks/usersService');
const { createAuthService } = require('./mocks/authService');
const { createNotificationsService } = require('./mocks/notificationsService');
const { createPlatformService } = require('./mocks/platformService');
const { createUpstreamClient } = require('./upstreamClient');

// Builds a fresh set of mocked upstream services and the client used to call them.
// Every call creates new in-memory state, which keeps tests independent.
function createServices() {
  const mocks = {
    users: createUsersService(),
    auth: createAuthService(),
    notifications: createNotificationsService(),
    platform: createPlatformService(),
  };

  return { upstream: createUpstreamClient(mocks) };
}

module.exports = { createServices };
