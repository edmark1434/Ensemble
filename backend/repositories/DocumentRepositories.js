const { pool } = require('../lib/Database');
const pgvector = require('pgvector');

async function replaceDocumentChunks({ url, chunks }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM document_chunks WHERE url = $1', [url]);
    for (const chunk of chunks) {
      await client.query(`
        INSERT INTO document_chunks (title, heading, url, content, chunk_index, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
      `, [
        chunk.title,
        chunk.heading,
        url,
        chunk.content,
        chunk.chunkIndex,
        pgvector.toSql(chunk.embedding),
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
  const result = await pool.query(`
    SELECT id, title, heading, url, content, chunk_index,
           1 - (embedding <=> $1::vector) AS similarity
    FROM document_chunks
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> $1::vector) >= $3
    ORDER BY embedding <=> $1::vector, id
    LIMIT $2
  `, [pgvector.toSql(embedding), limit, minSimilarity]);
  return result.rows.map((row) => ({
    ...row,
    similarity: Number(row.similarity),
  }));
}

async function getDocumentChunkCount() {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM document_chunks');
  return result.rows[0]?.count || 0;
}

module.exports = { replaceDocumentChunks, searchDocumentChunks, getDocumentChunkCount };
