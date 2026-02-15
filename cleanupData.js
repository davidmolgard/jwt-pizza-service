const { DB } = require('./src/database/database.js');

async function cleanup() {
  try {
    // Wait for database to initialize
    await DB.initialized;
    console.log('Connected to database');

    // Get all menu items
    const menu = await DB.getMenu();
    
    // Track seen pizzas to find duplicates
    const seen = {};
    let deletedItems = 0;
    
    for (const item of menu) {
      const key = `${item.title}|${item.description}`;
      
      if (seen[key]) {
        // This is a duplicate, delete it
        await DB.deleteMenuItem(item.id);
        deletedItems++;
      } else {
        // First time seeing this pizza, keep it
        seen[key] = item.id;
      }
    }
    console.log(`Deleted ${deletedItems} duplicate menu items`);

    // Get all franchises directly from DB using internal query method
    const connection = await DB._getConnection(false);
    try {
      // First set the database
      await connection.query(`USE ${require('./src/config.js').db.connection.database}`);
      
      const franchiseRows = await DB.query(connection, 'SELECT id FROM franchise');
      
      let deletedStores = 0;
      for (const franchiseRow of franchiseRows) {
        const franchiseData = await DB.getFranchise({ id: franchiseRow.id });
        if (franchiseData && franchiseData.stores) {
          const slcStores = franchiseData.stores.filter(s => s.name === 'SLC');
          // Keep the first SLC store, delete the rest
          for (let i = 1; i < slcStores.length; i++) {
            await DB.deleteStore(franchiseRow.id, slcStores[i].id);
            deletedStores++;
          }
        }
      }
      console.log(`Deleted ${deletedStores} duplicate stores`);
    } finally {
      connection.end();
    }

    console.log('Cleanup completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanup();
