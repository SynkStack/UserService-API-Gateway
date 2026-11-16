'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

describe('GET /api/platform/status', () => {
  it('reports every upstream as up when all is well', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/platform/status');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('operational');
    expect(res.body.data.upstreams).toEqual({
      users: 'up',
      auth: 'up',
      notifications: 'up',
      platform: 'up',
    });
    expect(res.body.data.platform).toMatchObject({ platform: 'NovaStack' });
  });

  it('reports "degraded" (still 200) when one upstream is down', async () => {
    const { app, services } = createTestApp();
    services.upstream.setState('notifications', 'unavailable');

    const res = await request(app).get('/api/platform/status');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.upstreams.notifications).toBe('down');
    expect(res.body.data.upstreams.users).toBe('up');
  });

  it('honestly reports that rate limiting is not implemented (DEBT-API-001)', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/platform/status');

    expect(res.body.data.features.rateLimiting).toBe(false);
  });
});
