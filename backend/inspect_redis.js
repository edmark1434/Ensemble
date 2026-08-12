const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL
});

async function run() {
  await client.connect();
  const keys = await client.keys('session:*');
  console.log(`Found ${keys.length} session keys`);
  
  // Just show up to 3 keys that don't have "Credentials" in the name
  let count = 0;
  for (const key of keys) {
    if (key.includes('Credentials')) continue;
    const val = await client.get(key);
    console.log(`Key: ${key}`);
    console.log(`Value: ${val}`);
    count++;
    if (count >= 3) break;
  }
  await client.disconnect();
}

run().catch(console.error);
