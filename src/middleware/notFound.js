'use strict';

const { AppError } = require('../errors');

// Runs when no route matched. It hands a 404 to the central error handler.
function notFound(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} does not exist`));
}

module.exports = { notFound };
