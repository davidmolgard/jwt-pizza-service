const request = require('supertest');
const app = require('../service');
const { Role } = require('../database/database.js');

let adminToken;
let adminUser;
let dinerToken;
let dinerUser;
let franchise;
let store;

beforeAll(async () => {
  // Login as default admin
  const adminRes = await request(app).put('/api/auth').send({
    email: 'a@jwt.com',
    password: 'admin',
  });
  adminToken = adminRes.body.token;
  adminUser = adminRes.body.user;

  // Create diner user
  const dinerRes = await request(app).post('/api/auth').send({
    name: 'diner user',
    email: Math.random().toString(36).substring(2, 12) + '@diner.com',
    password: 'dinerpass',
  });
  dinerToken = dinerRes.body.token;
  dinerUser = dinerRes.body.user;

  // Create franchise and store for orders
  const franchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `OrderFranchise-${Math.random().toString(36).substring(7)}`,
      admins: [{ email: adminUser.email }],
    });
  franchise = franchiseRes.body;

  const storeRes = await request(app)
    .post(`/api/franchise/${franchise.id}/store`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Test Store',
    });
  store = storeRes.body;
});

describe('Order Router', () => {
  describe('GET /api/order/menu', () => {
    test('get menu without auth', async () => {
      const res = await request(app).get('/api/order/menu');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('get menu returns menu items', async () => {
      const res = await request(app).get('/api/order/menu');
      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        expect(res.body[0].id).toBeDefined();
        expect(res.body[0].title).toBeDefined();
        expect(res.body[0].price).toBeDefined();
      }
    });
  });

  describe('GET /api/order', () => {
    test('authenticated user can get orders', async () => {
      const res = await request(app)
        .get('/api/order')
        .set('Authorization', `Bearer ${dinerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.dinerId).toBe(dinerUser.id);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.page).toBeDefined();
    });

    test('unauthenticated user cannot get orders', async () => {
      const res = await request(app).get('/api/order');
      expect(res.status).toBe(401);
    });

    test('get orders with pagination', async () => {
      const res = await request(app)
        .get('/api/order?page=1')
        .set('Authorization', `Bearer ${dinerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe('1');
    });
  });
});
