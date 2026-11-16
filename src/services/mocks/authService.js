'use strict';

// Mocked "auth" upstream service. The tokens below are fake demo values
// used only by this mock; they are not real credentials.

const TOKENS = {
  'demo-token': {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'admin',
    permissions: ['users:read', 'users:write', 'platform:read'],
  },
  'viewer-token': {
    id: 3,
    name: 'Alan Turing',
    email: 'alan@example.com',
    role: 'viewer',
    permissions: ['users:read'],
  },
};

function createAuthService() {
  return {
    name: 'auth',

    async health() {
      return { status: 'up' };
    },

    async getProfile(token) {
      const profile = TOKENS[token];
      return profile ? { ...profile, permissions: [...profile.permissions] } : null;
    },

    createFailure(mode) {
      if (mode === 'timeout') return Object.assign(new Error('read timeout'), { code: 'ESOCKETTIMEDOUT' });
      if (mode === 'error') {
        return Object.assign(new Error('auth failure'), { statusCode: 500, detail: 'stack trace: internal detail' });
      }
      return Object.assign(new Error('connect refused'), { code: 'ECONNREFUSED' });
    },
  };
}

module.exports = { createAuthService };
