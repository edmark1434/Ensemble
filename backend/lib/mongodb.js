const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
let client = null;
let isConnected = false;

async function connectMongoDB() {
  if (!uri) {
    console.warn('MONGODB_URI is not set — MongoDB features (forums) are disabled.');
    return null;
  }

  if (isConnected && client) {
    return client;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected successfully to MongoDB');
    isConnected = true;
    return client;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.warn('Server will continue without MongoDB — forum features may not work.');
    client = null;
    isConnected = false;
    return null;
  }
}

function getMongoClient() {
  return client;
}

// Add this function to safely fetch the DB instance dynamically
function getDB(dbName = 'ensemble') {
  if (!client) {
    throw new Error('Database client is not initialized. Make sure connectMongoDB() is called and awaited at server startup.');
  }
  return client.db(dbName);
}

// Export getDB along with your other functions
module.exports = { connectMongoDB, getMongoClient, getDB };