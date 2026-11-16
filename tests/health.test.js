'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

describe('GET /health', () => {
  it('reports that the gateway is running', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('userservice-api-gateway');
  });

  it('does not depend on upstream services', async () => {
    const { app, services } = createTestApp();
    ['users', 'auth', 'notifications', 'platform'].forEach((name) => services.upstream.setState(name, 'unavailable'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
  });
});
