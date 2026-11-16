'use strict';

// Mocked "platform" upstream service: reports information about the platform itself.

function createPlatformService() {
  return {
    name: 'platform',

    async health() {
      return { status: 'up' };
    },

    async getInfo() {
      return { platform: 'NovaStack', team: 'Platform Team', region: 'local-dev' };
    },

    createFailure(mode) {
      if (mode === 'timeout') return Object.assign(new Error('deadline exceeded'), { code: 'ETIMEDOUT' });
      if (mode === 'error') return Object.assign(new Error('boom'), { status: 502 });
      return Object.assign(new Error('service unavailable'), { status: 503 });
    },
  };
}

module.exports = { createPlatformService };
