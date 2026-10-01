const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./config/db');
const { runManualSeed } = require('./services/seedService');

dotenv.config();

const main = async () => {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    if (args.includes('--clean') || args.includes('--clear')) {
      console.log('[Seed] Cleaning all database collections to return to empty state...');
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
      console.log('[Seed] Database cleaned completely. 0 records remaining.');
      await disconnectDB();
      process.exit(0);
    }

    await runManualSeed();
    await disconnectDB();
    console.log('[Seed] Done. You can start the server now with: npm run start');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
};

main();
