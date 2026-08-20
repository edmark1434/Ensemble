/** Switches derived RAG vectors from OpenAI's 1536 dimensions to MiniLM's 384 dimensions. */
exports.up = (pgm) => {
  pgm.sql('TRUNCATE TABLE document_chunks;');
  pgm.sql(`
    ALTER TABLE document_chunks
    ALTER COLUMN embedding TYPE VECTOR(384);
  `);
};

exports.down = (pgm) => {
  pgm.sql('TRUNCATE TABLE document_chunks;');
  pgm.sql(`
    ALTER TABLE document_chunks
    ALTER COLUMN embedding TYPE VECTOR(1536);
  `);
};
