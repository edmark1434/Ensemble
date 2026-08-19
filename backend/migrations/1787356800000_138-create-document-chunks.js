/** Creates vector-backed document chunks for semantic retrieval. */
exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector;');

  pgm.sql(`
    CREATE TABLE document_chunks (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      heading TEXT NOT NULL,
      url TEXT NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
      embedding VECTOR(1536) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT document_chunks_url_chunk_index_key UNIQUE (url, chunk_index)
    );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('document_chunks', { ifExists: true });
};
