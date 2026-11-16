'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

describe('routing edge cases', () => {
  it('returns 404 ROUTE_NOT_FOUND for an unknown route', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 404 for a known path with an unsupported method', async () => {
    const { app } = createTestApp();

    const res = await request(app).delete('/api/users/1');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 400 INVALID_JSON for a malformed JSON body', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/api/users').set('Content-Type', 'application/json').send('{bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 PAYLOAD_TOO_LARGE for a huge body', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'x'.repeat(20000), email: 'big@example.com' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
