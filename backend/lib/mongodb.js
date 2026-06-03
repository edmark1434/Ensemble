const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
let client = null;
let isConnected = false;

async function connectDB() {
    if (isConnected) return client;

    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
        isConnected = true;
        return client;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Stop the app if we can't connect to our database
    }
}

module.exports = { client, connectMongoDB };