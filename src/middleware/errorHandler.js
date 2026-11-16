'use strict';

const { AppError, UpstreamCallError } = require('../errors');

// Last stop for every error. All error responses have this shape:
// { "success": false, "error": { "code", "message", "details"? }, "requestId" }
function createErrorHandler({ logger }) {
  // Express recognises error handlers by their 4 arguments, so all four must stay.
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details;

    if (err instanceof AppError) {
      ({ status, code, message, details } = err);
    } else if (err && err.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'Request body is not valid JSON';
    } else if (err && err.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body is too large';
    }

    if (status >= 500) {
      // Full detail goes to the logs only, never to the client.
      logger.error('request failed', {
        requestId: req.id,
        code,
        error: err instanceof UpstreamCallError ? String(err.cause && err.cause.message) : err && err.message,
        ...(details || {}),
      });
    }

    const error = { code, message };
    if (details) error.details = details;

    res.status(status).json({ success: false, error, requestId: req.id });
  };
}

module.exports = { createErrorHandler };
