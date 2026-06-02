const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/awaz-e-shehr';
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.__dbConnection = {
      ok: true,
      connectedAt: new Date().toISOString(),
      uriPresent: Boolean(process.env.MONGODB_URI),
      lastError: null
    };
    return true;
  } catch (error) {
    const safeError = {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      hostname: error?.hostname,
      stack: error?.stack
    };
    global.__dbConnection = {
      ok: false,
      failedAt: new Date().toISOString(),
      uriPresent: Boolean(process.env.MONGODB_URI),
      lastError: safeError
    };
    console.error('Database connection error (safe):', JSON.stringify(safeError));
    console.warn('Continuing without a database connection. Some features will be unavailable.');
    return false;
  }
};

module.exports = connectDB;
