require('dotenv').config();
const { ingestDocumentation } = require('../services/DocumentationIngestionServices');
const { pool } = require('../lib/Database');

async function main() {
  const results = await ingestDocumentation();
  for (const result of results) {
    console.log(`Ingested ${result.chunks} chunk(s): ${result.name} (${result.url})`);
  }
  console.log(`Documentation ingestion complete: ${results.length} source(s).`);
}

main()
  .catch((error) => {
    console.error('Documentation ingestion failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
