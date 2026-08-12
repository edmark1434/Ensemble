const { nanoid } = require('nanoid');

const PUBLIC_ID_LENGTH = 21;
const MAX_PUBLIC_ID_ATTEMPTS = 5;

function generatePublicId() {
  return nanoid(PUBLIC_ID_LENGTH);
}

async function insertWithPublicIdRetry(insert, maxAttempts = MAX_PUBLIC_ID_ATTEMPTS) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await insert(generatePublicId());
    if (result?.rows?.[0]) return result.rows[0];
  }
  const error = new Error('Unable to allocate a unique public ID.');
  error.code = 'PUBLIC_ID_COLLISION';
  throw error;
}

module.exports = { PUBLIC_ID_LENGTH, generatePublicId, insertWithPublicIdRetry };
