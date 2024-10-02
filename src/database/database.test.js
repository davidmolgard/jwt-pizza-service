const request = require('supertest');
const app = require('../service'); // Assuming your service is exported from service.js

// Test user and authToken
const testUser = { name: 'pizza diner', email: 'd@test.com', password: 'diner' };
let authToken;

beforeAll(async () => {
  // Register a test user and get a token
  const registerRes = await request(app).post('/api/auth').send(testUser);
  authToken = registerRes.body.token;
});

describe('API Endpoint Tests', () => {
  // POST /api/auth - Register a new user
  test('POST /api/auth - Register a new user', async () => {
    const response = await request(app).post('/api/auth').send({
      name: 'testUser',
      email: 'test@jwt.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.name).toBe('testUser');
    expect(response.body).toHaveProperty('token');
  });

  // PUT /api/auth - Login existing user
  test('PUT /api/auth - Login existing user', async () => {
    const response = await request(app).put('/api/auth').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body).toHaveProperty('token');
  });

  // PUT /api/auth/:userId - Update user
  test('PUT /api/auth/:userId - Update user', async () => {
    const updatedEmail = 'newemail@jwt.com';
    const response = await request(app)
      .put(`/api/auth/${1}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: updatedEmail,
        password: 'newpassword',
      });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(updatedEmail);
  });

  // DELETE /api/auth - Logout user
  test('DELETE /api/auth - Logout user', async () => {
    const response = await request(app)
      .delete('/api/auth')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('logout successful');
  });

  // GET /api/order/menu - Get the pizza menu
  test('GET /api/order/menu - Get pizza menu', async () => {
    const response = await request(app).get('/api/order/menu');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('title');
    expect(response.body[0]).toHaveProperty('price');
  });

  // PUT /api/order/menu - Add an item to the menu
  test('PUT /api/order/menu - Add a menu item', async () => {
    const response = await request(app)
      .put('/api/order/menu')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'New Pizza',
        description: 'Delicious new pizza',
        image: 'newpizza.png',
        price: 10.5,
      });

    expect(response.status).toBe(200);
    expect(response.body[0].title).toBe('New Pizza');
  });

  // GET /api/order - Get user orders
  test('GET /api/order - Get user orders', async () => {
    const response = await request(app)
      .get('/api/order')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.dinerId).toBeDefined();
    expect(response.body.orders.length).toBeGreaterThanOrEqual(0);
  });

  // POST /api/order - Create an order for the authenticated user
  test('POST /api/order - Create an order', async () => {
    const response = await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Veggie', price: 0.05 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.order).toHaveProperty('id');
    expect(response.body.order.items[0].description).toBe('Veggie');
  });

  // GET /api/franchise - List all franchises
  test('GET /api/franchise - List franchises', async () => {
    const response = await request(app).get('/api/franchise');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('name');
  });

  // POST /api/franchise - Create a new franchise
  test('POST /api/franchise - Create a franchise', async () => {
    const response = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'New Franchise',
        admins: [{ email: testUser.email }],
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('New Franchise');
  });

  // DELETE /api/franchise/:franchiseId - Delete a franchise
  test('DELETE /api/franchise/:franchiseId - Delete a franchise', async () => {
    const response = await request(app)
      .delete('/api/franchise/1')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('franchise deleted');
  });
});
