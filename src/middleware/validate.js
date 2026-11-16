'use strict';

const { AppError } = require('../errors');

const ROLES = ['admin', 'developer', 'viewer'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(details) {
  return new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
}

// Returns an integer for strings like "12", or null for anything else ("abc", "1.5", "-3").
function toInteger(value) {
  return typeof value === 'string' && /^\d+$/.test(value) ? Number.parseInt(value, 10) : null;
}

// Each validator checks one kind of input and stores the cleaned values on req.validated.

function validateUserId(req, _res, next) {
  const id = toInteger(req.params.id);
  if (id === null || id < 1) {
    return next(fail([{ field: 'id', message: 'Must be a positive integer' }]));
  }
  req.validated = { id };
  return next();
}

function validateListUsersQuery(req, _res, next) {
  const { role, limit, offset } = req.query;
  const details = [];
  const parsed = { limit: 20, offset: 0 };

  if (limit !== undefined) {
    const value = toInteger(limit);
    if (value === null || value < 1 || value > 50) details.push({ field: 'limit', message: 'Must be an integer between 1 and 50' });
    else parsed.limit = value;
  }
  if (offset !== undefined) {
    const value = toInteger(offset);
    if (value === null) details.push({ field: 'offset', message: 'Must be an integer of 0 or more' });
    else parsed.offset = value;
  }
  if (role !== undefined) {
    if (!ROLES.includes(role)) details.push({ field: 'role', message: `Must be one of: ${ROLES.join(', ')}` });
    else parsed.role = role;
  }

  if (details.length > 0) return next(fail(details));
  req.validated = parsed;
  return next();
}

function validateCreateUserBody(req, _res, next) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const details = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 100) {
    details.push({ field: 'name', message: 'Required, 2 to 100 characters' });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    details.push({ field: 'email', message: 'Required, must be a valid email address' });
  }

  const role = body.role === undefined ? 'viewer' : body.role;
  if (!ROLES.includes(role)) {
    details.push({ field: 'role', message: `Must be one of: ${ROLES.join(', ')}` });
  }

  if (details.length > 0) return next(fail(details));
  req.validated = { name, email, role };
  return next();
}

function validateNotificationsQuery(req, _res, next) {
  const { userId, unread } = req.query;
  const details = [];
  const parsed = {};

  if (userId !== undefined) {
    const value = toInteger(userId);
    if (value === null || value < 1) details.push({ field: 'userId', message: 'Must be a positive integer' });
    else parsed.userId = value;
  }
  if (unread !== undefined) {
    if (unread !== 'true' && unread !== 'false') details.push({ field: 'unread', message: 'Must be "true" or "false"' });
    else parsed.unread = unread === 'true';
  }

  if (details.length > 0) return next(fail(details));
  req.validated = parsed;
  return next();
}

module.exports = {
  validateUserId,
  validateListUsersQuery,
  validateCreateUserBody,
  validateNotificationsQuery,
  ROLES,
};
