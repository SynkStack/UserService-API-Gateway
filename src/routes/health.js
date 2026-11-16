'use strict';

const { Router } = require('express');
const { sendSuccess } = require('./respond');

// GET /health
// Liveness check for the gateway itself. It does not call any upstream service.
// Response 200: { status: "ok", service, uptimeSeconds }
function createHealthRouter() {
  const router = Router();

  router.get('/health', (req, res) => {
    sendSuccess(req, res, {
      status: 'ok',
      service: 'userservice-api-gateway',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  return router;
}

module.exports = { createHealthRouter };
