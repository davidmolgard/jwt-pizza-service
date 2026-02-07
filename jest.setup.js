// Ensure database is initialized before tests run
const { DB } = require('./src/database/database.js');

beforeAll(async () => {
  // Wait for database to initialize
  await DB.initialized;
  console.log('Database initialized for tests');
}, 30000); // 30 second timeout for DB initialization
