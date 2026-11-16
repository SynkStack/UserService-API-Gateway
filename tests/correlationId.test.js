'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('request correlation IDs', () => {
  it('generates an ID when none is supplied', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/health');

    expect(res.headers['x-request-id']).toMatch(UUID_PATTERN);
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('generates a different ID for every request', async () => {
    const { app } = createTestApp();

    const first = await request(app).get('/health');
    const second = await request(app).get('/health');

    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  it('propagates a valid incoming X-Request-ID', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users').set('X-Request-ID', 'client-req-12345');

    expect(res.headers['x-request-id']).toBe('client-req-12345');
    expect(res.body.requestId).toBe('client-req-12345');
  });

  it('replaces an invalid incoming ID (too short, bad characters, too long)', async () => {
    const { app } = createTestApp();
    const invalidIds = ['short', 'has spaces in it', 'semi;colon;injection', 'a'.repeat(129)];

    for (const invalidId of invalidIds) {
      const res = await request(app).get('/health').set('X-Request-ID', invalidId);
      expect(res.headers['x-request-id']).toMatch(UUID_PATTERN);
    }
  });

  it('includes the ID in error responses', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users/abc').set('X-Request-ID', 'client-req-error-1');

    expect(res.status).toBe(400);
    expect(res.headers['x-request-id']).toBe('client-req-error-1');
    expect(res.body.requestId).toBe('client-req-error-1');
  });

  it('includes the ID on unknown routes', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/nope').set('X-Request-ID', 'client-req-404-1');

    expect(res.status).toBe(404);
    expect(res.body.requestId).toBe('client-req-404-1');
  });

  it('includes the ID in structured logs', async () => {
    const { app, logLines } = createTestApp();

    await request(app).get('/api/users/1').set('X-Request-ID', 'client-req-log-1');

    const entry = logLines.find((line) => line.message === 'request completed');
    expect(entry).toMatchObject({
      level: 'info',
      requestId: 'client-req-log-1',
      method: 'GET',
      path: '/api/users/1',
      status: 200,
    });
  });
});
