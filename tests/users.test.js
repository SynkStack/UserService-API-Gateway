'use strict';

const request = require('supertest');
const { createTestApp } = require('./helpers/testApp');

describe('GET /api/users', () => {
  it('returns the seeded users', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(4);
    expect(res.body.data.users).toHaveLength(4);
    expect(res.body.data.users[0]).toMatchObject({ id: 1, name: 'Ada Lovelace', role: 'admin' });
  });

  it('filters by role and paginates', async () => {
    const { app } = createTestApp();

    const byRole = await request(app).get('/api/users?role=developer');
    expect(byRole.body.data.users.map((user) => user.id)).toEqual([2, 4]);

    const page = await request(app).get('/api/users?limit=1&offset=1');
    expect(page.body.data.users.map((user) => user.id)).toEqual([2]);
    expect(page.body.data.total).toBe(4);
  });

  it('rejects invalid query parameters with 400', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users?limit=0&role=boss');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((detail) => detail.field).sort()).toEqual(['limit', 'role']);
  });
});

describe('GET /api/users/:id', () => {
  it('returns one user', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users/2');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: 2, email: 'grace@example.com' });
  });

  it('returns 404 when the user does not exist', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/api/users/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it.each(['abc', '0', '1.5', '-3'])('rejects the invalid id "%s" with 400', async (id) => {
    const { app } = createTestApp();

    const res = await request(app).get(`/api/users/${id}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/users', () => {
  it('creates a user and makes it retrievable', async () => {
    const { app } = createTestApp();

    const created = await request(app)
      .post('/api/users')
      .send({ name: 'Katherine Johnson', email: 'katherine@example.com', role: 'developer' });

    expect(created.status).toBe(201);
    expect(created.headers.location).toBe('/api/users/5');
    expect(created.body.data.user).toMatchObject({ id: 5, name: 'Katherine Johnson', role: 'developer' });

    const fetched = await request(app).get('/api/users/5');
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.user.email).toBe('katherine@example.com');
  });

  it('defaults the role to viewer', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/api/users').send({ name: 'Dorothy Vaughan', email: 'dorothy@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('viewer');
  });

  it('rejects invalid input with 400 and field details', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/api/users').send({ name: 'A', email: 'not-an-email', role: 'boss' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((detail) => detail.field)).toEqual(['name', 'email', 'role']);
  });

  it('rejects an empty body with 400', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/api/users');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for a duplicate email (case-insensitive)', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/api/users').send({ name: 'Ada Clone', email: 'ADA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});
