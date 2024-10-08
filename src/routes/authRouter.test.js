const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  expect(loginRes.body.user.id).toBe(testUserId);
  expect(loginRes.body.user).toMatchObject({
    id: expect.any(Number), 
    name: testUser.name,
    email: testUser.email,
    roles: [{ role: 'diner' }]
  });
});

test('register', async () => {
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  expect(registerRes.body.user).toMatchObject({
    id: expect.any(Number), // Expect an ID to be present
    name: testUser.name,
    email: testUser.email,
    roles: [{ role: 'diner' }]
  });
});

test('update', async () => {
  const updatedData = { email: 'update@test.com', password: 'newpassword' };

  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updatedData);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body).toMatchObject({
    id: expect.any(Number),
    name: testUser.name, // Retaining the original name, assuming it's unchanged
    email: updatedData.email,
    roles: [{ role: 'diner' }]
  });
});

test('logout', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toMatchObject({ message: 'logout successful' });
});

