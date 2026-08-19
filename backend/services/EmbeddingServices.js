class EmbeddingError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'EmbeddingError';
    this.statusCode = statusCode;
  }
}

let extractorPromise;

function embeddingConfig() {
  const model = String(process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2').trim();
  const dimension = Number(process.env.EMBEDDING_DIMENSION || 384);
  if (!model) throw new EmbeddingError('Embedding model is not configured', 503);
  if (!Number.isInteger(dimension) || dimension !== 384) {
    throw new EmbeddingError('Embedding dimension must match VECTOR(384)', 503);
  }
  return { model, dimension };
}

async function getExtractor(model) {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', model))
      .catch((error) => {
        extractorPromise = undefined;
        throw error;
      });
  }
  return extractorPromise;
}

async function createEmbedding(text) {
  const input = String(text || '').trim();
  if (!input) throw new EmbeddingError('Embedding input is required', 400);
  const config = embeddingConfig();
  try {
    const extractor = await getExtractor(config.model);
    const output = await extractor(input, {
      pooling: 'mean',
      normalize: true,
    });
    const embedding = Array.from(output.data || []);
    if (!Array.isArray(embedding) || embedding.length !== config.dimension || embedding.some((n) => !Number.isFinite(n))) {
      throw new EmbeddingError(`Embedding model returned an invalid ${config.dimension}-dimension vector`);
    }
    return embedding;
  } catch (error) {
    if (error instanceof EmbeddingError) throw error;
    console.error('Local embedding model failed to load or run:', error.message);
    throw new EmbeddingError('Local embedding model failed to load or run');
  }
}

module.exports = { EmbeddingError, createEmbedding };
