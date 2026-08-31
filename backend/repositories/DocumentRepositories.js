const { pool } = require('../lib/Database');

function serializeEmbedding(embedding) {
  if (!Array.isArray(embedding) || !embedding.length || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error('Document embedding must be a non-empty array of finite numbers');
  }
  return JSON.stringify(embedding);
}

function parseEmbedding(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const embedding = JSON.parse(value);
    return Array.isArray(embedding) && embedding.every((item) => Number.isFinite(item))
      ? embedding
      : null;
  } catch {
    return null;
  }
}

function cosineSimilarity(left, right) {
  if (!left.length || left.length !== right.length) return null;
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (!leftMagnitude || !rightMagnitude) return null;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

async function replaceDocumentChunks({ url, chunks }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM document_chunks WHERE url = $1', [url]);
    for (const chunk of chunks) {
      await client.query(`
        INSERT INTO document_chunks (title, heading, url, content, chunk_index, embedding)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        chunk.title,
        chunk.heading,
        url,
        chunk.content,
        chunk.chunkIndex,
        serializeEmbedding(chunk.embedding),
      ]);
    }
    await client.query('COMMIT');
    return chunks.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function searchDocumentChunks(embedding, limit = 5, minSimilarity = 0.2) {
  const queryEmbedding = parseEmbedding(embedding);
  if (!queryEmbedding?.length) throw new Error('Search embedding must be a non-empty array of finite numbers');
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 5, 1), 20);
  const configuredCandidates = Number.parseInt(process.env.RAG_MAX_SEARCH_CANDIDATES, 10);
  const candidateLimit = Math.min(
    Math.max(Number.isInteger(configuredCandidates) ? configuredCandidates : 5000, safeLimit),
    10000,
  );
  const similarityFloor = Number.isFinite(Number(minSimilarity)) ? Number(minSimilarity) : 0.2;
  const result = await pool.query(`
    SELECT id, title, heading, url, content, chunk_index, embedding
    FROM document_chunks
    WHERE embedding IS NOT NULL
    ORDER BY id DESC
    LIMIT $1
  `, [candidateLimit]);
  return result.rows
    .map(({ embedding: storedEmbedding, ...row }) => {
      const parsedEmbedding = parseEmbedding(storedEmbedding);
      const similarity = parsedEmbedding ? cosineSimilarity(queryEmbedding, parsedEmbedding) : null;
      return similarity == null ? null : { ...row, similarity };
    })
    .filter((row) => row && row.similarity >= similarityFloor)
    .sort((left, right) => right.similarity - left.similarity || String(left.id).localeCompare(String(right.id)))
    .slice(0, safeLimit);
}

async function getDocumentChunkCount() {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM document_chunks');
  return result.rows[0]?.count || 0;
}

module.exports = { replaceDocumentChunks, searchDocumentChunks, getDocumentChunkCount };