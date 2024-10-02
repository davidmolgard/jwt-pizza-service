const request = require('supertest');
const app = require('../service');
const { DB, Role } = require('../database/database.js');

let adminAuthToken;
let adminId;
let adminEmail;

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    await DB.addUser(user);
  
    user.password = 'toomanysecrets';
    return user;
}

beforeAll(async () => {

  const user = await createAdminUser();

  const loginRes = await request(app).put('/api/auth').send(user);
  adminAuthToken = loginRes.body.token;
  adminId = loginRes.body.user.id;
  adminEmail = loginRes.body.user.email;
});

test('update menu item', async () => {
    const updatedMenuItem = {
      title: "Student",
      description: "No topping, no sauce, just carbs",
      image: "pizza9.png",
      price: 0.0001
    };
  
    const updateMenuRes = await request(app)
      .put('/api/order/menu') // Assuming this endpoint updates the menu item
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .set('Content-Type', 'application/json')
      .send(updatedMenuItem);
  
    expect(updateMenuRes.status).toBe(200);
    expect(updateMenuRes.body).toEqual(
      expect.arrayContaining([
        {
          id: expect.any(Number), // Expect an ID to be present
          title: updatedMenuItem.title,
          description: updatedMenuItem.description,
          image: updatedMenuItem.image,
          price: updatedMenuItem.price
        }
      ])
    );
});

test('get menu', async () => {
    const menuRes = await request(app)
      .get('/api/order/menu')
      .set('Authorization', `Bearer ${adminAuthToken}`);
  
    expect(menuRes.status).toBe(200);
    expect(menuRes.body).toEqual(
      expect.arrayContaining([
        {
          id: expect.any(Number), // Expect an ID to be present
          title: expect.any(String), // Expect a title to be present
          image: expect.any(String), // Expect an image to be present
          price: expect.any(Number), // Expect a price to be present
          description: expect.any(String) // Expect a description to be present
        }
      ])
    );
});
  
