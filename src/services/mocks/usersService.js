'use strict';

// Mocked "users" upstream service. In a real system this would be a separate
// microservice; here it is an in-memory object with deterministic seed data.

const SEED_USERS = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', createdAt: '2025-01-10T09:00:00.000Z' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com', role: 'developer', createdAt: '2025-02-14T09:00:00.000Z' },
  { id: 3, name: 'Alan Turing', email: 'alan@example.com', role: 'viewer', createdAt: '2025-03-21T09:00:00.000Z' },
  { id: 4, name: 'Margaret Hamilton', email: 'margaret@example.com', role: 'developer', createdAt: '2025-04-02T09:00:00.000Z' },
];

function createUsersService() {
  const users = SEED_USERS.map((user) => ({ ...user }));
  let nextId = SEED_USERS.length + 1;

  return {
    name: 'users',

    async health() {
      return { status: 'up' };
    },

    async listUsers({ role, limit, offset }) {
      const filtered = role ? users.filter((user) => user.role === role) : users;
      return {
        users: filtered.slice(offset, offset + limit).map((user) => ({ ...user })),
        total: filtered.length,
      };
    },

    async getUser(id) {
      const user = users.find((candidate) => candidate.id === id);
      return user ? { ...user } : null;
    },

    async createUser({ name, email, role }) {
      const emailTaken = users.some((user) => user.email.toLowerCase() === email.toLowerCase());
      if (emailTaken) return { created: false, reason: 'EMAIL_EXISTS' };

      const user = { id: nextId, name, email, role, createdAt: new Date().toISOString() };
      nextId += 1;
      users.push(user);
      return { created: true, user: { ...user } };
    },

    // Each mocked service fails in its own (inconsistent) way, like real services do.
    // The gateway has to cope with all of these shapes.
    createFailure(mode) {
      if (mode === 'timeout') return Object.assign(new Error('socket timeout'), { code: 'ETIMEDOUT' });
      if (mode === 'error') return { status: 500, message: 'users-svc crashed: secret internal detail' };
      return { status: 503, message: 'users-svc is down' };
    },
  };
}

module.exports = { createUsersService, SEED_USERS };
