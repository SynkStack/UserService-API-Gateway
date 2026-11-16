'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

describe('GET /api/notifications', () => {
  it('returns all notifications', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(4);
    expect(res.body.data.notifications[0]).toMatchObject({ id: 1, userId: 1, type: 'deployment' });
  });

  it('filters by userId and unread', async () => {
    const { app } = createTestApp();

    const forUser = await request(app).get('/api/notifications?userId=1');
    expect(forUser.body.data.notifications.map((item) => item.id)).toEqual([1, 2]);

    const unreadOnly = await request(app).get('/api/notifications?userId=1&unread=true');
    expect(unreadOnly.body.data.notifications.map((item) => item.id)).toEqual([1]);
  });

  it('rejects invalid query parameters with 400', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/notifications?userId=abc&unread=maybe');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((detail) => detail.field)).toEqual(['userId', 'unread']);
  });
});
