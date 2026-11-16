'use strict';

const { AppError, UpstreamCallError } = require('../errors');

// Every mocked upstream fails differently (see createFailure in each mock):
//   { status: 503 }, { code: 'ECONNREFUSED' }, { error: 'unavailable' }, ...
// This middleware turns all of them into one of three AppErrors, so clients
// always see the same response shape and never see raw upstream details.
function classify(raw) {
  const code = raw && raw.code;
  const status = raw && (raw.status || raw.statusCode);

  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
    return {
      status: 504,
      code: 'UPSTREAM_TIMEOUT',
      message: 'The requested service did not respond in time',
    };
  }

  if (code === 'ECONNREFUSED' || status === 503 || (raw && raw.error === 'unavailable')) {
    return {
      status: 503,
      code: 'UPSTREAM_SERVICE_UNAVAILABLE',
      message: 'The requested service is temporarily unavailable',
    };
  }

  return {
    status: 502,
    code: 'UPSTREAM_BAD_RESPONSE',
    message: 'The requested service returned an unexpected response',
  };
}

// An Express error-handling middleware (4 arguments). It sits just before the final error handler.
function normalizeUpstreamError(err, _req, _res, next) {
  if (!(err instanceof UpstreamCallError)) return next(err);

  const { status, code, message } = classify(err.cause);
  return next(new AppError(status, code, message, { upstream: err.service }));
}

module.exports = { normalizeUpstreamError, classify };
