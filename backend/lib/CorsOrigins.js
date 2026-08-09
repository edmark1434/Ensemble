function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push('http://localhost:5173');
  }

  return [...new Set(configuredOrigins)];
}

function createCorsOriginValidator(allowedOrigins = getAllowedOrigins()) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  };
}

module.exports = {
  getAllowedOrigins,
  createCorsOriginValidator,
};
