// Ensure database is initialized before tests run
const { DB } = require('./src/database/database.js');
const { Role } = require('./src/database/database.js');

beforeAll(async () => {
  // Wait for database to initialize
  await DB.initialized;
  console.log('Database initialized for tests');

  // Ensure default admin user exists
  try {
    await DB.getUser('a@jwt.com');
    console.log('Default admin user exists');
    // eslint-disable-next-line no-unused-vars
  } catch (_err) {
    console.log('Creating default admin user');
    const defaultAdmin = { name: '常用名字', email: 'a@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] };
    await DB.addUser(defaultAdmin);
    console.log('Default admin user created');
  }
}, 30000); // 30 second timeout for DB initialization

