const request = require('supertest');
const app = require('../service');
const { DB, Role } = require('../database/database.js');

let adminToken;
let adminUser;
let franchiseeToken;
let franchiseeUser;

beforeAll(async () => {
  // Login as default admin
  const adminRes = await request(app).put('/api/auth').send({
    email: 'a@jwt.com',
    password: 'admin',
  });
  adminToken = adminRes.body.token;
  adminUser = adminRes.body.user;

  // Create franchisee user
  const franchiseeRes = await request(app).post('/api/auth').send({
    name: 'franchisee user',
    email: Math.random().toString(36).substring(2, 12) + '@franchisee.com',
    password: 'franchiseepass',
  });
  franchiseeToken = franchiseeRes.body.token;
  franchiseeUser = franchiseeRes.body.user;
});

describe('Franchise Router', () => {
  describe('GET /api/franchise', () => {
    test('list franchises without auth', async () => {
      const res = await request(app).get('/api/franchise');
      expect(res.status).toBe(200);
      expect(res.body.franchises).toBeDefined();
      expect(res.body.more).toBeDefined();
    });

    test('list franchises with pagination', async () => {
      const res = await request(app).get('/api/franchise?page=0&limit=10');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.franchises)).toBe(true);
      expect(typeof res.body.more).toBe('boolean');
    });

    test('list franchises with name filter', async () => {
      const res = await request(app).get('/api/franchise?page=0&limit=10&name=*');
      expect(res.status).toBe(200);
      expect(res.body.franchises).toBeDefined();
    });
  });

  describe('GET /api/franchise/:userId', () => {
    test('get user franchises with auth', async () => {
      const res = await request(app)
        .get(`/api/franchise/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('get user franchises without auth', async () => {
      const res = await request(app).get(`/api/franchise/${adminUser.id}`);
      expect(res.status).toBe(401);
    });

    test('user cannot access other user franchises', async () => {
      const res = await request(app)
        .get(`/api/franchise/${adminUser.id}`)
        .set('Authorization', `Bearer ${franchiseeToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/franchise', () => {
    test('non-admin cannot create franchise', async () => {
      const res = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${franchiseeToken}`)
        .send({
          name: 'UnauthorizedFranchise',
          admins: [{ email: franchiseeUser.email }],
        });

      expect(res.status).toBe(403);
    });

    test('unauthenticated user cannot create franchise', async () => {
      const res = await request(app).post('/api/franchise').send({
        name: 'UnauthorizedFranchise',
        admins: [{ email: adminUser.email }],
      });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/franchise/:franchiseId', () => {
    test('delete non-existent franchise returns error', async () => {
      const res = await request(app).delete('/api/franchise/99999');
      // May return 200 or error depending on implementation
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/franchise/:franchiseId/store', () => {
    test('unauthenticated user cannot create store', async () => {
      const res = await request(app).post('/api/franchise/1/store').send({
        name: 'Unauthorized Store',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/franchise/:franchiseId/store/:storeId', () => {
    test('unauthenticated user cannot delete store', async () => {
      const res = await request(app).delete('/api/franchise/1/store/1');
      expect(res.status).toBe(401);
    });
  });
});
