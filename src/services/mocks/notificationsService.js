'use strict';

// Mocked "notifications" upstream service with deterministic seed data.

const SEED_NOTIFICATIONS = [
  { id: 1, userId: 1, type: 'deployment', message: 'Deployment of gateway v1.0.0 finished', read: false, createdAt: '2025-05-01T10:00:00.000Z' },
  { id: 2, userId: 1, type: 'security', message: 'New API key created', read: true, createdAt: '2025-05-02T11:30:00.000Z' },
  { id: 3, userId: 2, type: 'mention', message: 'Ada mentioned you in a review', read: false, createdAt: '2025-05-03T08:15:00.000Z' },
  { id: 4, userId: 3, type: 'system', message: 'Scheduled maintenance on Friday', read: false, createdAt: '2025-05-04T16:45:00.000Z' },
];

function createNotificationsService() {
  return {
    name: 'notifications',

    async health() {
      return { status: 'up' };
    },

    async listNotifications({ userId, unread }) {
      let result = SEED_NOTIFICATIONS;
      if (userId !== undefined) result = result.filter((item) => item.userId === userId);
      if (unread === true) result = result.filter((item) => !item.read);
      return {
        notifications: result.map((item) => ({ ...item })),
        total: result.length,
      };
    },

    createFailure(mode) {
      if (mode === 'timeout') return Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
      if (mode === 'error') return { status: 500, body: '<html>Internal Server Error</html>' };
      return { error: 'unavailable', retryAfter: 30 };
    },
  };
}

module.exports = { createNotificationsService };
