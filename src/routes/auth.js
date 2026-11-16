'use strict';

const { Router } = require('express');
const { AppError } = require('../errors');
const { sendSuccess } = require('./respond');

// Routes forwarded to the mocked "auth" upstream service.
function createAuthRouter({ upstream }) {
  const router = Router();

  // GET /api/auth/profile
  // Header: Authorization: Bearer <token>   (mock tokens: demo-token, viewer-token)
  // 200 profile | 401 AUTH_REQUIRED (no/invalid header) | 401 INVALID_TOKEN | 502/503/504 upstream failure
  router.get('/profile', async (req, res) => {
    const header = req.get('Authorization') || '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) {
      throw new AppError(401, 'AUTH_REQUIRED', 'A Bearer token is required in the Authorization header');
    }

    const profile = await upstream.call('auth', 'getProfile', [match[1]], { simulate: req.simulate });
    if (!profile) throw new AppError(401, 'INVALID_TOKEN', 'The provided token is not valid');
    sendSuccess(req, res, { profile });
  });

  return router;
}

module.exports = { createAuthRouter };
