const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured');
  }

  try {
    cachedConnection = await mongoose.connect(process.env.MONGO_URI);
    console.log(`\nMongoDB Connected: ${cachedConnection.connection.host}`);
    return cachedConnection;
  } catch (error) {
    cachedConnection = null;
    console.error(`\nMongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
