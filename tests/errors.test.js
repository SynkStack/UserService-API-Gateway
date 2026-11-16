'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

const SERVICES = [
  { name: 'users', path: '/api/users' },
  { name: 'auth', path: '/api/auth/profile', headers: { Authorization: 'Bearer demo-token' } },
  { name: 'notifications', path: '/api/notifications' },
];

const EXPECTED = {
  unavailable: { status: 503, code: 'UPSTREAM_SERVICE_UNAVAILABLE' },
  timeout: { status: 504, code: 'UPSTREAM_TIMEOUT' },
  error: { status: 502, code: 'UPSTREAM_BAD_RESPONSE' },
};

describe('upstream failures are normalized', () => {
  describe.each(SERVICES)('$name service', ({ name, path, headers }) => {
    it.each(Object.entries(EXPECTED))('maps a "%s" failure to the standard error', async (mode, expected) => {
      const { app, services } = createTestApp();
      services.upstream.setState(name, mode);

      const res = await request(app).get(path).set(headers || {}).set('X-Request-ID', 'client-req-upstream');

      expect(res.status).toBe(expected.status);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: expected.code,
          message: expect.any(String),
          details: { upstream: name },
        },
        requestId: 'client-req-upstream',
      });
    });
  });

  it('never leaks raw upstream details to clients', async () => {
    const { app, services } = createTestApp();
    services.upstream.setState('users', 'error');

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/secret internal detail|crashed|stack trace/);
  });

  it('does not expose internal error details in response headers', async () => {
    const { app, services } = createTestApp();
    services.upstream.setState('users', 'error');

    const res = await request(app)
      .get('/api/users')
      .set('X-Request-ID', 'client-req-secure-1');

    expect(res.status).toBe(502);
    expect(res.headers['x-request-id']).toBe('client-req-secure-1');

    expect(res.headers).not.toHaveProperty('x-error');
    expect(res.headers).not.toHaveProperty('x-stack-trace');

    expect(JSON.stringify(res.body)).not.toMatch(/stack|internal|crashed/i);
  });

  it('normalizes failures on POST routes too', async () => {
    const { app, services } = createTestApp();
    services.upstream.setState('users', 'unavailable');

    const res = await request(app).post('/api/users').send({ name: 'Test User', email: 'test@example.com' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('UPSTREAM_SERVICE_UNAVAILABLE');
    expect(res.body.error.message).toBe('The requested service is temporarily unavailable');
  });

  it('recovers when an upstream comes back', async () => {
    const { app, services } = createTestApp();
    services.upstream.setState('users', 'unavailable');
    expect((await request(app).get('/api/users')).status).toBe(503);

    services.upstream.setState('users', 'up');
    expect((await request(app).get('/api/users')).status).toBe(200);
  });

  it('logs upstream failures with the request ID (and the raw cause stays out of the response)', async () => {
    const { app, services, logLines } = createTestApp();
    services.upstream.setState('notifications', 'timeout');

    await request(app).get('/api/notifications').set('X-Request-ID', 'client-req-logfail');

    const failure = logLines.find((line) => line.message === 'request failed');
    expect(failure).toMatchObject({ level: 'error', requestId: 'client-req-logfail', code: 'UPSTREAM_TIMEOUT', upstream: 'notifications' });
  });
});

describe('X-Simulate-Upstream-Failure header', () => {
  it('forces a failure for a single request only', async () => {
    const { app } = createTestApp();

    const failed = await request(app).get('/api/users').set('X-Simulate-Upstream-Failure', 'timeout');
    expect(failed.status).toBe(504);
    expect(failed.body.error.code).toBe('UPSTREAM_TIMEOUT');

    const normal = await request(app).get('/api/users');
    expect(normal.status).toBe(200);
  });

  it('rejects unknown simulation values with 400', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users').set('X-Simulate-Upstream-Failure', 'explode');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('is ignored when ENABLE_FAILURE_SIMULATION is false', async () => {
    const { app } = createTestApp({ ENABLE_FAILURE_SIMULATION: 'false' });

    const res = await request(app).get('/api/users').set('X-Simulate-Upstream-Failure', 'timeout');

    expect(res.status).toBe(200);
  });
});

describe('error response consistency', () => {
  const failingRequests = [
    ['validation error', (app) => request(app).get('/api/users/abc')],
    ['not found (user)', (app) => request(app).get('/api/users/999')],
    ['not found (route)', (app) => request(app).get('/nope')],
    ['unauthorized', (app) => request(app).get('/api/auth/profile')],
    ['conflict', (app) => request(app).post('/api/users').send({ name: 'Ada Clone', email: 'ada@example.com' })],
    ['invalid JSON', (app) => request(app).post('/api/users').set('Content-Type', 'application/json').send('{oops')],
    ['upstream failure', (app) => request(app).get('/api/users').set('X-Simulate-Upstream-Failure', 'unavailable')],
  ];

  it.each(failingRequests)('uses the standard error shape for: %s', async (_label, send) => {
    const { app } = createTestApp();

    const res = await send(app).set('X-Request-ID', 'client-req-shape-1');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.error.code).toBe('string');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.requestId).toBe('client-req-shape-1');
    expect(Object.keys(res.body).sort()).toEqual(['error', 'requestId', 'success']);
  });
});
