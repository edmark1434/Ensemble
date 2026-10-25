require('dotenv').config();
const { pool } = require('../lib/Database');
const { runMediaWorker } = require('../services/MediaJobServices');

runMediaWorker({
  concurrency: Number.parseInt(process.env.MEDIA_WORKER_CONCURRENCY, 10) || 1,
})
  .catch((error) => {
    console.error('Media worker crashed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
