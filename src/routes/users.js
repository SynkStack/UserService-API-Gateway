'use strict';

const { Router } = require('express');
const { AppError } = require('../errors');
const { sendSuccess } = require('./respond');
const {
  validateUserId,
  validateListUsersQuery,
  validateCreateUserBody,
} = require('../middleware/validate');

// Routes forwarded to the mocked "users" upstream service.
function createUsersRouter({ upstream }) {
  const router = Router();

  // GET /api/users?role=&limit=&offset=
  // Lists users. role: admin | developer | viewer. limit: 1-50 (default 20). offset: 0+ (default 0).
  // 200 list | 400 VALIDATION_ERROR | 502/503/504 upstream failure
  router.get('/', validateListUsersQuery, async (req, res) => {
    const { role, limit, offset } = req.validated;
    const result = await upstream.call('users', 'listUsers', [{ role, limit, offset }], { simulate: req.simulate });
    sendSuccess(req, res, { ...result, limit, offset });
  });

  // GET /api/users/:id
  // Returns one user. :id must be a positive integer.
  // 200 user | 400 VALIDATION_ERROR | 404 USER_NOT_FOUND | 502/503/504 upstream failure
  router.get('/:id', validateUserId, async (req, res) => {
    const user = await upstream.call('users', 'getUser', [req.validated.id], { simulate: req.simulate });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', `User ${req.validated.id} was not found`);
    sendSuccess(req, res, { user });
  });

  // POST /api/users
  // Body (JSON): { name: string 2-100, email: valid email, role?: admin | developer | viewer }
  // 201 created user | 400 VALIDATION_ERROR / INVALID_JSON | 409 EMAIL_ALREADY_EXISTS | 502/503/504 upstream failure
  router.post('/', validateCreateUserBody, async (req, res) => {
    const result = await upstream.call('users', 'createUser', [req.validated], { simulate: req.simulate });
    if (!result.created) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists');
    }
    res.set('Location', `/api/users/${result.user.id}`);
    sendSuccess(req, res, { user: result.user }, 201);
  });

  return router;
}

module.exports = { createUsersRouter };
