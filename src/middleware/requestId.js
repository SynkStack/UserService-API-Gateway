'use strict';

const { randomUUID } = require('node:crypto');

// Accept only "boring" IDs: 8-128 letters, digits, dots, underscores or dashes.
// Anything else (too short, too long, odd characters) is ignored and replaced,
// which stops clients from injecting junk into logs and headers.
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

function requestId(req, res, next) {
  const incoming = req.get('X-Request-ID');
  const id = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();

  req.id = id;
  res.set('X-Request-ID', id);
  next();
}

module.exports = { requestId, VALID_REQUEST_ID };
