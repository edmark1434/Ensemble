const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
let client = null;
let isConnected = false;

async function ensureChatIndexes(database) {
  await Promise.all([
    database.collection('messages').createIndex(
      { conversation_id: 1, created_at: -1 },
      { name: 'chat_messages_conversation_created' }
    ),
    database.collection('messages').createIndex(
      { message_id_reply: 1 },
      { name: 'chat_messages_reply_parent', sparse: true }
    ),
    database.collection('inbox').createIndex(
      {
        conversation_type: 1,
        'members.account_id': 1,
        deleted_at: 1,
        last_message_time: -1,
      },
      { name: 'chat_inbox_member_type_latest' }
    ),
    database.collection('inbox').createIndex(
      { conversation_type: 1, engagement_id: 1 },
      { name: 'chat_inbox_engagement_context', sparse: true }
    ),
    database.collection('inbox').createIndex(
      { conversation_type: 1, job_id: 1 },
      { name: 'chat_inbox_job_context', sparse: true }
    ),
    database.collection('inbox').createIndex(
      { conversation_type: 1, gig_id: 1 },
      { name: 'chat_inbox_gig_context', sparse: true }
    ),
    database.collection('google_meet_connections').createIndex(
      { account_id: 1 },
      { name: 'google_meet_connections_account', unique: true }
    ),
    database.collection('google_meetings').createIndex(
      { conversation_id: 1, status: 1, started_at: -1 },
      { name: 'google_meetings_conversation_status' }
    ),
  ]);
}

async function connectMongoDB() {
  if (!uri) {
    console.warn('MONGODB_URI is not set — MongoDB features (forums, dispute/ticket chats) are disabled.');
    return null;
  }

  if (isConnected && client) {
    return client;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    await ensureChatIndexes(client.db('ensemble'));
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

// Returns a lazy proxy for a collection so requiring a repository module does
// not touch MongoDB at import time. getDB() is only invoked on first actual use,
// which lets the server boot without MongoDB (forum/inbox features stay optional).
function lazyCollection(name, dbName = 'ensemble') {
  return new Proxy({}, {
    get(_target, prop) {
      const collection = getDB(dbName).collection(name);
      const value = collection[prop];
      return typeof value === 'function' ? value.bind(collection) : value;
    }
  });
}

// Export getDB along with your other functions
module.exports = { connectMongoDB, getMongoClient, getDB, lazyCollection };
