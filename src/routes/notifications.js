'use strict';

const { Router } = require('express');
const { sendSuccess } = require('./respond');
const { validateNotificationsQuery } = require('../middleware/validate');

// Routes forwarded to the mocked "notifications" upstream service.
function createNotificationsRouter({ upstream }) {
  const router = Router();

  // GET /api/notifications?userId=&unread=
  // Lists notifications. userId: positive integer. unread: "true" | "false".
  // 200 list | 400 VALIDATION_ERROR | 502/503/504 upstream failure
  router.get('/', validateNotificationsQuery, async (req, res) => {
    const result = await upstream.call('notifications', 'listNotifications', [req.validated], {
      simulate: req.simulate,
    });
    sendSuccess(req, res, result);
  });

  return router;
}

module.exports = { createNotificationsRouter };
