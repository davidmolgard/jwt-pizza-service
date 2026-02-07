const request = require('supertest');
const app = require('../service');

let adminToken;
let adminUser;
let userToken;
let user;

beforeAll(async () => {
  // Login as default admin
  const adminRes = await request(app).put('/api/auth').send({
    email: 'a@jwt.com',
    password: 'admin',
  });
  adminToken = adminRes.body.token;
  adminUser = adminRes.body.user;

  // Create regular user
  const userRes = await request(app).post('/api/auth').send({
    name: 'test user',
    email: Math.random().toString(36).substring(2, 12) + '@test.com',
    password: 'userpass',
  });
  userToken = userRes.body.token;
  user = userRes.body.user;
});

describe('User Router', () => {
  describe('GET /api/user/me', () => {
    test('authenticated user can get their info', async () => {
      const res = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user.id);
      expect(res.body.name).toBe(user.name);
      expect(res.body.email).toBe(user.email);
      expect(res.body.roles).toBeDefined();
    });

    test('unauthenticated user cannot get user info', async () => {
      const res = await request(app).get('/api/user/me');
      expect(res.status).toBe(401);
    });

    test('admin can get their info', async () => {
      const res = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(adminUser.id);
      expect(res.body.roles).toBeDefined();
    });
  });

  describe('PUT /api/user/:userId', () => {
    test('user can update their own info', async () => {
      const updatedName = `Updated-${Math.random().toString(36).substring(7)}`;
      const res = await request(app)
        .put(`/api/user/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: updatedName,
          email: user.email,
          password: 'userpass',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.name).toBe(updatedName);
      expect(res.body.token).toBeDefined();
    });

    test('user cannot update other user info', async () => {
      const res = await request(app)
        .put(`/api/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked',
          email: 'hacked@test.com',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('unauthorized');
    });

    test('unauthenticated user cannot update user', async () => {
      const res = await request(app).put(`/api/user/${user.id}`).send({
        name: 'New Name',
        email: 'new@test.com',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/user/:userId', () => {
    test('delete user returns not implemented', async () => {
      const res = await request(app)
        .delete(`/api/user/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('not implemented');
    });
  });

  describe('GET /api/user', () => {
    test('list users returns not implemented', async () => {
      const res = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('not implemented');
      expect(res.body.users).toEqual([]);
      expect(res.body.more).toBe(false);
    });

    test('unauthenticated user cannot list users', async () => {
      const res = await request(app).get('/api/user');
      expect(res.status).toBe(401);
    });
  });
});
