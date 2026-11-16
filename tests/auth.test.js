'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

describe('GET /api/auth/profile', () => {
  it('returns the profile for a valid mock token', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer demo-token');

    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({ id: 1, name: 'Ada Lovelace', role: 'admin' });
    expect(res.body.data.profile.permissions).toContain('users:write');
  });

  it('returns a different profile for a different token', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer viewer-token');

    expect(res.body.data.profile).toMatchObject({ id: 3, role: 'viewer' });
  });

  it('returns 401 AUTH_REQUIRED when the header is missing or malformed', async () => {
    const { app } = createTestApp();

    const missing = await request(app).get('/api/auth/profile');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('AUTH_REQUIRED');

    const malformed = await request(app).get('/api/auth/profile').set('Authorization', 'Token demo-token');
    expect(malformed.status).toBe(401);
    expect(malformed.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 INVALID_TOKEN for an unknown token', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer nope');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
