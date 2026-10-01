const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medstock_ai';

  try {
    // Attempt connecting to the configured MongoDB URI
    console.log(`[Database] Attempting connection to MongoDB: ${primaryUri}`);
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 3000 // Fast failover to memory server if local mongod is absent
    });
    console.log(`[Database] Connected successfully to MongoDB at: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Could not connect to primary MongoDB instance (${err.message}).`);
    console.log('[Database] Initializing fallback in-memory MongoDB instance for seamless local operation...');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected successfully to fallback MongoMemoryServer at: ${memoryUri}`);
      console.log('[Database] NOTE: Database starts completely EMPTY as required. To persist permanently, configure MONGODB_URI in server/.env');
      return conn;
    } catch (memErr) {
      console.error('[Database] Fatal: Failed to initialize in-memory fallback MongoDB:', memErr.message);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
