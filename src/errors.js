'use strict';

// AppError is the one error type the gateway understands.
// Anything that is not an AppError ends up as a generic 500 response.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Wraps whatever an upstream (mocked) service threw, and remembers which
// service it came from. The raw failure is kept in `cause` and is never
// sent to clients.
class UpstreamCallError extends Error {
  constructor(service, cause) {
    super(`Upstream call to "${service}" failed`);
    this.name = 'UpstreamCallError';
    this.service = service;
    this.cause = cause;
  }
}

module.exports = { AppError, UpstreamCallError };
