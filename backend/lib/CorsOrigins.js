function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function consoleOriginsFor(frontendUrl) {
  let url;
  try {
    url = new URL(frontendUrl);
  } catch {
    return [];
  }
  const host = url.hostname.toLowerCase();
  const port = url.port ? `:${url.port}` : '';
  if (host === 'localhost' || host === '127.0.0.1') {
    return ['admin', 'staff'].map((label) => `${url.protocol}//${label}.localhost${port}`);
  }
  if (
    host === 'ensemble.software'
    || host === 'www.ensemble.software'
    || host === 'admin.ensemble.software'
    || host === 'staff.ensemble.software'
  ) {
    return ['admin', 'staff'].map((label) => `${url.protocol}//${label}.ensemble.software`);
  }
  return [];
}

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  configuredOrigins.push(...configuredOrigins.flatMap(consoleOriginsFor));

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push(
      'http://localhost:5173',
      'http://admin.localhost:5173',
      'http://staff.localhost:5173',
    );
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
