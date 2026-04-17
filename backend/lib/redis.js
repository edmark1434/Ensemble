// config/redis.js
const { createClient } = require('redis');
require('dotenv').config();

//create and connect Redis client using URL from environment variable or default to localhost
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});
//connect to Redis and log any connection errors
redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

module.exports = redisClient;