const request = require('supertest');
const express = require('express');
const { DB, Role } = require('../database/database.js');
const authRouter = require('./authRouter.js'); // Assuming this is the correct import
const franchiseRouter = require('./franchiseRouter.js');

const app = express();
app.use(express.json());
app.use('/api/franchise', franchiseRouter);

let adminUser;
let authToken;

async function createAdminUser() {
  adminUser = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  adminUser.name = 'adminUser';
  adminUser.email = `${adminUser.name}@admin.com`;

  // Create an admin user in the database
  await DB.addUser(adminUser);

  // Log in to get the auth token
  const response = await request(app)
    .put('/api/auth')
    .send({ email: adminUser.email, password: adminUser.password });

  return response.body.token;
}

beforeAll(async () => {
  authToken = await createAdminUser();
});

afterAll(async () => {
  // Cleanup: delete the created admin user
  await DB.deleteUser(adminUser.email); // Ensure that this method exists in your DB class
});

describe('Franchise API Tests', () => {
  test('GET /api/franchise - List all franchises', async () => {
    const response = await request(app).get('/').set('Authorization', `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  test('GET /api/franchise/:userId - List a user\'s franchises', async () => {
    const userId = adminUser.id; // Use the admin user ID
    const response = await request(app)
      .get(`/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  test('POST /api/franchise - Create a new franchise', async () => {
    const newFranchise = { name: 'pizzaPocket', admins: [{ email: 'f@jwt.com' }] };
    const response = await request(app)
      .post('/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newFranchise);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', newFranchise.name);
    expect(response.body).toHaveProperty('admins');
  });

  test('DELETE /api/franchise/:franchiseId - Delete a franchise', async () => {
    const franchiseId = 1; // Adjust to a valid franchise ID in your test database
    const response = await request(app)
      .delete(`/${franchiseId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('franchise deleted');
  });

  test('POST /api/franchise/:franchiseId/store - Create a new franchise store', async () => {
    const franchiseId = 1; // Adjust to a valid franchise ID
    const newStore = { name: 'SLC', franchiseId: franchiseId };
    const response = await request(app)
      .post(`/${franchiseId}/store`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(newStore);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', newStore.name);
  });

  test('DELETE /api/franchise/:franchiseId/store/:storeId - Delete a store', async () => {
    const franchiseId = 1; // Adjust to a valid franchise ID
    const storeId = 1; // Adjust to a valid store ID
    const response = await request(app)
      .delete(`/${franchiseId}/store/${storeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('store deleted');
  });
});
