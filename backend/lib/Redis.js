const { createClient } = require('redis');
require('dotenv').config();

const memoryData = new Map();
const memoryExpiry = new Map();

function createMemoryClient() {
  const now = () => Date.now();

  const isExpired = (key) => {
    const exp = memoryExpiry.get(key);
    if (exp == null) return false;
    if (exp <= now()) {
      memoryData.delete(key);
      memoryExpiry.delete(key);
      return true;
    }
    return false;
  };

  return {
    async connect() {},
    on() {},
    async get(key) {
      if (isExpired(key)) return null;
      return memoryData.get(key) ?? null;
    },
    async set(key, value, options = {}) {
      memoryData.set(key, value);
      if (options.EX != null) {
        memoryExpiry.set(key, now() + options.EX * 1000);
      } else if (options.PX != null) {
        memoryExpiry.set(key, now() + options.PX);
      } else {
        memoryExpiry.delete(key);
      }
    },
    async del(key) {
      memoryData.delete(key);
      memoryExpiry.delete(key);
    },
    async incr(key) {
      if (isExpired(key)) {
        memoryData.delete(key);
      }
      const next = Number(memoryData.get(key) || 0) + 1;
      memoryData.set(key, String(next));
      return next;
    },
    async pExpire(key, ms) {
      if (memoryData.has(key)) {
        memoryExpiry.set(key, now() + ms);
      }
    },
    async pTTL(key) {
      if (!memoryData.has(key) || isExpired(key)) {
        return -2;
      }
      const exp = memoryExpiry.get(key);
      if (exp == null) {
        return -1;
      }
      const remaining = exp - now();
      return remaining > 0 ? remaining : -2;
    },
    async ping() {
      return 'PONG';
    },
  };
}

let redisClient = createMemoryClient();
let clientMode = 'memory';

async function initRedis() {
  if (process.env.REDIS_USE_MEMORY === 'true') {
    console.log('Redis: using in-memory store (REDIS_USE_MEMORY=true)');
    redisClient = createMemoryClient();
    clientMode = 'memory';
    return;
  }

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const realClient = createClient({ url });

  realClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
  });

  try {
    await realClient.connect();
    await realClient.ping();
    redisClient = realClient;
    clientMode = 'redis';
    console.log('Redis: connected');
  } catch (err) {
    console.warn(
      `Redis unavailable (${err.message}). Using in-memory store — fine for local dev; fix REDIS_URL for production.`
    );
    redisClient = createMemoryClient();
    clientMode = 'memory';
  }
}

const redisReady = initRedis();

async function getRedis() {
  await redisReady;
  return redisClient;
}

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'getClientMode') {
        return () => clientMode;
      }
      if (prop === 'ready') {
        return redisReady;
      }
      return async (...args) => {
        const client = await getRedis();
        const fn = client[prop];
        if (typeof fn !== 'function') {
          throw new Error(`Redis client has no method "${String(prop)}"`);
        }
        return fn.apply(client, args);
      };
    },
  }
);
