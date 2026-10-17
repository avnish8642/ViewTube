import mongoose from 'mongoose';

let mongodInstance = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    console.log('[DB] Reusing existing MongoDB connection.');
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/viewtube';

  try {
    // Attempt standard connection with 3s timeout
    console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (primaryError) {
    console.warn(`[DB] Primary connection failed: ${primaryError.message}`);

    // In development/test, fallback to in-memory MongoDB so the entire application runs seamlessly
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[DB] Starting in-memory MongoDB server fallback for local execution...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!mongodInstance) {
          mongodInstance = await MongoMemoryServer.create();
        }
        const memUri = mongodInstance.getUri();
        console.log(`[DB] In-memory MongoDB started at: ${memUri}`);
        const conn = await mongoose.connect(memUri);
        console.log(`[DB] Successfully connected to in-memory MongoDB!`);
        return conn;
      } catch (memError) {
        console.error('[DB] Failed to launch in-memory MongoDB:', memError.message);
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};
