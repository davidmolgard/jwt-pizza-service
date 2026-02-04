const { Role, DB } = require('../database/database.js');
const bcrypt = require('bcrypt');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = {
    name: randomName(),
    email: `${randomName()}@admin.com`,
    password: 'toomanysecrets',
    roles: [{ role: Role.Admin }],
  };

  const created = await DB.addUser(user);
  return { ...created, email: user.email, password: user.password };
}

describe('Database integration tests', () => {
  let admin;

  beforeAll(async () => {
    // Ensure DB initialization completes
    await DB.initialized;
    admin = await createAdminUser();
  });

  describe('User management', () => {
    test('addUser creates a user without returning password', async () => {
      const user = {
        name: randomName(),
        email: `${randomName()}@test.com`,
        password: 'secret',
        roles: [{ role: Role.Admin }],
      };

      const result = await DB.addUser(user);

      expect(result.id).toBeDefined();
      expect(result.password).toBeUndefined();
      expect(result.email).toBe(user.email);
    });

    test('getUser returns user with roles and no password', async () => {
      const fetched = await DB.getUser(admin.email, admin.password);

      expect(fetched.id).toBeDefined();
      expect(fetched.roles.length).toBeGreaterThan(0);
      expect(fetched.password).toBeUndefined();
    });

    test('getUser throws for wrong password', async () => {
      await expect(
        DB.getUser(admin.email, 'wrongpassword')
      ).rejects.toThrow();
    });

    test('updateUser updates name and email', async () => {
      const newName = randomName();
      const newEmail = `${randomName()}@updated.com`;

      const updated = await DB.updateUser(
        admin.id,
        newName,
        newEmail,
        admin.password
      );

      expect(updated.name).toBe(newName);
      expect(updated.email).toBe(newEmail);
    });
  });

  describe('Authentication', () => {
    const token = 'header.payload.signature';

    test('loginUser and isLoggedIn work together', async () => {
      await DB.loginUser(admin.id, token);
      const loggedIn = await DB.isLoggedIn(token);
      expect(loggedIn).toBe(true);
    });

    test('logoutUser invalidates token', async () => {
      await DB.logoutUser(token);
      const loggedIn = await DB.isLoggedIn(token);
      expect(loggedIn).toBe(false);
    });
  });

  describe('Menu', () => {
    test('addMenuItem and getMenu', async () => {
      const item = {
        title: 'Burger',
        description: 'Test burger',
        image: 'burger.png',
        price: 9.99,
      };

      const created = await DB.addMenuItem(item);
      expect(created.id).toBeDefined();

      const menu = await DB.getMenu();
      const found = menu.find((m) => m.id === created.id);

      expect(found).toBeDefined();
      expect(found.title).toBe('Burger');
    });
  });

  describe('Franchises and stores', () => {
    let franchise;
    let store;

    test('createFranchise assigns franchisee role', async () => {
      franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: admin.email }],
      });

      expect(franchise.id).toBeDefined();
      expect(franchise.admins[0].email).toBe(admin.email);
    });

    test('createStore creates a store under franchise', async () => {
      store = await DB.createStore(franchise.id, { name: 'Main Store' });

      expect(store.id).toBeDefined();
      expect(store.franchiseId).toBe(franchise.id);
    });

    test('getFranchise returns admins and stores', async () => {
      const full = await DB.getFranchise({ id: franchise.id });

      expect(full.admins.length).toBeGreaterThan(0);
      expect(full.stores.length).toBeGreaterThan(0);
    });

    test('deleteStore removes store', async () => {
      await DB.deleteStore(franchise.id, store.id);

      const full = await DB.getFranchise({ id: franchise.id });
      const exists = full.stores.find((s) => s.id === store.id);

      expect(exists).toBeUndefined();
    });

    test('deleteFranchise removes franchise and roles', async () => {
      await DB.deleteFranchise(franchise.id);

      const [franchises] = await DB.getFranchises(admin, 0, 10);
      const exists = franchises.find((f) => f.id === franchise.id);

      expect(exists).toBeUndefined();
    });
  });
});


if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}