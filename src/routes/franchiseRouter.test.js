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

test('create franchise', async () => {
    const franchiseName = randomName();
    const newFranchise = {
        name: `${franchiseName}`,
        admins: [{ email: `${adminEmail}` }]
    };

    const createFranchiseRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('Content-Type', 'application/json')
        .send(newFranchise);

    expect(createFranchiseRes.status).toBe(200); // Check for created status
    expect(createFranchiseRes.body).toMatchObject({
        name: newFranchise.name,
        admins: [
            {
                email: adminEmail,
                id: expect.any(Number), // Expect admin ID to be present
                name: expect.any(String) // Expect admin name to be present
            }
        ],
        id: expect.any(Number) // Expect franchise ID to be present
    });
});

test('getUserFranchise', async () => {
    const getFranchiseRes = await request(app)
    .get(`/api/franchise/${adminId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);

    expect(getFranchiseRes.status).toBe(200);
    expect(getFranchiseRes.body).toEqual([
        {
            id: expect.any(Number), // Expect an ID to be present
            name: expect.any(String), // Expect a name to be present
            admins: [
                {
                    id: expect.any(Number), // Expect an admin ID to be present
                    name: expect.any(String), // Expect an admin name to be present
                    email: expect.any(String) // Expect an admin email to be present
                }
            ],
            stores: []
        }
    ]);
});
