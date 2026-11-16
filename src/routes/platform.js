'use strict';

const { Router } = require('express');
const { sendSuccess } = require('./respond');
const { version } = require('../../package.json');

// Aggregates the health of every mocked upstream service.
function createPlatformRouter({ config, upstream }) {
  const router = Router();

  // GET /api/platform/status
  // Always answers 200. If an upstream is down the overall status is "degraded"
  // and that service is reported as "down" (the endpoint reports problems, it does not fail on them).
  router.get('/status', async (req, res) => {
    const checks = await Promise.all(
      upstream.serviceNames.map(async (name) => {
        try {
          const result = await upstream.call(name, 'health', [], { simulate: req.simulate });
          return [name, result.status];
        } catch {
          return [name, 'down'];
        }
      })
    );

    const upstreams = Object.fromEntries(checks);
    const allUp = Object.values(upstreams).every((status) => status === 'up');

    // Extra platform details are optional: if that service is down, we simply omit them.
    const info = await upstream
      .call('platform', 'getInfo', [], { simulate: req.simulate })
      .catch(() => null);

    sendSuccess(req, res, {
      status: allUp ? 'operational' : 'degraded',
      gateway: { name: 'UserService API Gateway', version, environment: config.env },
      platform: info,
      upstreams,
      features: {
        correlationIds: true,
        errorNormalization: true,
        // Honest status: see DEBT-API-001 in the README.
        rateLimiting: false,
      },
    });
  });

  return router;
}

module.exports = { createPlatformRouter };
