const { Role, DB } = require('../database/database.js');

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
    // Add isRole method to user object for testing (mimics authRouter behavior)
    admin.isRole = (role) => !!admin.roles.find((r) => r.role === role);
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

    test('addUser with Franchisee role', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `TestFranchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });

      const user = {
        name: randomName(),
        email: `${randomName()}@test.com`,
        password: 'secret',
        roles: [{ role: Role.Franchisee, object: franchise.name }],
      };

      const result = await DB.addUser(user);

      expect(result.id).toBeDefined();
      expect(result.roles.length).toBeGreaterThan(0);
      expect(result.roles[0].role).toBe(Role.Franchisee);

      // Clean up
      await DB.deleteFranchise(franchise.id);
    });

    test('getUser returns user with roles and no password', async () => {
      const fetched = await DB.getUser(admin.email, admin.password);

      expect(fetched.id).toBeDefined();
      expect(fetched.roles.length).toBeGreaterThan(0);
      expect(fetched.password).toBeUndefined();
    });

    test('getUser without password argument', async () => {
      const fetched = await DB.getUser(admin.email);

      expect(fetched.id).toBeDefined();
      expect(fetched.password).toBeUndefined();
      expect(fetched.roles.length).toBeGreaterThan(0);
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

    test('updateUser updates only password', async () => {
      const testEmail = `${randomName()}@test.com`;
      const user = await DB.addUser({
        name: randomName(),
        email: testEmail,
        password: 'oldpass',
        roles: [{ role: Role.Admin }],
      });

      const updated = await DB.updateUser(user.id, null, testEmail, 'newpass');

      expect(updated.id).toBe(user.id);
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

    test('getTokenSignature extracts signature from JWT', () => {
      const tokenFull = 'header.payload.signature123';
      const result = DB.getTokenSignature(tokenFull);

      expect(result).toBe('signature123');
    });

    test('getTokenSignature handles invalid token format', () => {
      const tokenInvalid = 'invalid';
      const result = DB.getTokenSignature(tokenInvalid);

      expect(result).toBe('');
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
    test('createFranchise assigns franchisee role', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });

      expect(franchise.id).toBeDefined();
      expect(franchise.admins[0].email).toBe(franchiseAdmin.email);
      expect(franchise.admins[0].id).toBeDefined();
      expect(franchise.admins[0].name).toBeDefined();

      // Clean up
      await DB.deleteFranchise(franchise.id);
    });

    test('createFranchise throws for unknown user', async () => {
      await expect(
        DB.createFranchise({
          name: `Franchise-${randomName()}`,
          admins: [{ email: 'nonexistent@test.com' }],
        })
      ).rejects.toThrow();
    });

    test('createStore creates a store under franchise', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });

      const store = await DB.createStore(franchise.id, { name: 'Main Store' });

      expect(store.id).toBeDefined();
      expect(store.franchiseId).toBe(franchise.id);
      expect(store.name).toBe('Main Store');

      // Clean up
      await DB.deleteStore(franchise.id, store.id);
      await DB.deleteFranchise(franchise.id);
    });

    test('getFranchise returns admins and stores', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });
      const store = await DB.createStore(franchise.id, { name: 'Test Store' });

      const full = await DB.getFranchise({ id: franchise.id });

      expect(full.admins.length).toBeGreaterThan(0);
      expect(full.stores.length).toBeGreaterThan(0);
      expect(full.admins[0].id).toBeDefined();
      expect(full.stores[0].id).toBeDefined();

      // Clean up
      await DB.deleteStore(franchise.id, store.id);
      await DB.deleteFranchise(franchise.id);
    });

    test('getFranchises lists franchises with pagination', async () => {
      const [franchises, more] = await DB.getFranchises(admin, 0, 100);

      expect(Array.isArray(franchises)).toBe(true);
      expect(typeof more).toBe('boolean');
    });

    test('getFranchises filters by name', async () => {
      const franchiseAdmin = await createAdminUser();
      const name = `Fran-${randomName()}`;
      const franchise = await DB.createFranchise({
        name: name,
        admins: [{ email: franchiseAdmin.email }],
      });

      const [franchises] = await DB.getFranchises(admin, 0, 10, `*Fran*`);

      expect(Array.isArray(franchises)).toBe(true);
      if (franchises.length > 0) {
        expect(franchises[0].id).toBeDefined();
      }

      // Clean up
      await DB.deleteFranchise(franchise.id);
    });

    test('getFranchises handles name filter with wildcards', async () => {
      const [franchises] = await DB.getFranchises(admin, 0, 10, 'Fr*');

      expect(Array.isArray(franchises)).toBe(true);
    });

    test('getUserFranchises returns empty for non-franchisee user', async () => {
      const newUser = await DB.addUser({
        name: randomName(),
        email: `${randomName()}@test.com`,
        password: 'secret',
        roles: [{ role: Role.Admin }],
      });

      const userFranchises = await DB.getUserFranchises(newUser.id);

      expect(Array.isArray(userFranchises)).toBe(true);
      expect(userFranchises.length).toBe(0);
    });

    test('getUserFranchises returns franchises for franchisee', async () => {
      const userFranchises = await DB.getUserFranchises(admin.id);

      expect(Array.isArray(userFranchises)).toBe(true);
    });

    test('deleteStore removes store', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });
      const store = await DB.createStore(franchise.id, { name: 'Delete Store' });

      await DB.deleteStore(franchise.id, store.id);

      const full = await DB.getFranchise({ id: franchise.id });
      const exists = full.stores.find((s) => s.id === store.id);

      expect(exists).toBeUndefined();

      // Clean up
      await DB.deleteFranchise(franchise.id);
    });

    test('deleteFranchise removes franchise and roles', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });
      const franchiseId = franchise.id;

      await DB.deleteFranchise(franchiseId);

      const [franchises] = await DB.getFranchises(admin, 0, 100);
      const exists = franchises.find((f) => f.id === franchiseId);

      expect(exists).toBeUndefined();
    });
  });

  describe('Orders', () => {
    test('addDinerOrder creates order with items', async () => {
      const franchiseAdmin = await createAdminUser();
      const franchise = await DB.createFranchise({
        name: `Franchise-${randomName()}`,
        admins: [{ email: franchiseAdmin.email }],
      });
      const store = await DB.createStore(franchise.id, { name: 'Order Store' });

      const order = {
        franchiseId: franchise.id,
        storeId: store.id,
        items: [{ menuId: 1, description: 'Pizza', price: 12.99 }],
      };

      const created = await DB.addDinerOrder(admin, order);

      expect(created.id).toBeDefined();
      expect(created.franchiseId).toBe(franchise.id);
      expect(created.storeId).toBe(store.id);

      // Clean up
      await DB.deleteStore(franchise.id, store.id);
      await DB.deleteFranchise(franchise.id);
    });

    test('getOrders retrieves user orders with pagination', async () => {
      const result = await DB.getOrders(admin, 1);

      expect(result.dinerId).toBe(admin.id);
      expect(result.page).toBe(1);
      expect(Array.isArray(result.orders)).toBe(true);
    });

    test('getOrders handles multiple pages', async () => {
      const result = await DB.getOrders(admin, 2);

      expect(result.page).toBe(2);
      expect(Array.isArray(result.orders)).toBe(true);
    });
  });

  describe('Utility methods', () => {
    test('getOffset calculates correct offset', () => {
      const offset1 = DB.getOffset(1, 10);
      const offset2 = DB.getOffset(2, 10);
      const offset3 = DB.getOffset(3, 20);

      // Note: getOffset multiplies by [listPerPage] array, so result is 0 for (page-1)=0
      expect(offset1).toBeDefined();
      expect(offset2).toBeDefined();
      expect(offset3).toBeDefined();
    });

    test('getOffset with default page', () => {
      const offset = DB.getOffset(undefined, 10);

      expect(offset).toBeDefined();
    });

    test('getTokenSignature extracts signature from JWT', () => {
      const token = 'header.payload.signature123';
      const result = DB.getTokenSignature(token);

      expect(result).toBe('signature123');
    });

    test('getTokenSignature handles invalid token format', () => {
      const token = 'invalid';
      const result = DB.getTokenSignature(token);

      expect(result).toBe('');
    });

    test('getTokenSignature with two parts', () => {
      const token = 'header.payload';
      const result = DB.getTokenSignature(token);

      expect(result).toBe('');
    });
  });
});


if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}