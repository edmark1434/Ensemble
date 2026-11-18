const crypto = require('crypto');
const redis = require('../lib/Redis');
const { sendDynamicEmailService } = require('./EmailServices');
const { ServiceError } = require('./UserServices');

/**
 * Email sign-in codes for staff without an authenticator app, used while
 * System settings → Security → "Require staff 2FA" is on.
 *
 * Only a SHA-256 of the code is stored. A code lasts 10 minutes, a new one is not
 * sent more than once a minute, and five wrong entries discard it.
 */
const CODE_TTL_SECONDS = 10 * 60;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function keyFor(email) {
  return `staff2fa:v2:${String(email || '').trim().toLowerCase()}`;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  const shown = local.slice(0, Math.min(2, local.length));
  return `${shown}${'•'.repeat(Math.max(1, local.length - shown.length))}@${domain}`;
}

async function readState(email) {
  try {
    const raw = await redis.get(keyFor(email));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.hash === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeState(email, state, ttlSeconds) {
  await redis.set(keyFor(email), JSON.stringify(state), { EX: Math.max(1, Math.ceil(ttlSeconds)) });
}

async function clearState(email) {
  await redis.del(keyFor(email)).catch(() => null);
}

/**
 * Email a new code, unless one was sent in the last minute and is still valid.
 * @returns {Promise<{ emailHint: string, sent: boolean }>}
 */
async function issueStaffEmailCode({ email, name }) {
  const address = String(email || '').trim().toLowerCase();
  if (!address) throw new ServiceError('This staff account has no email address for sign-in codes.', 400);

  const now = Date.now();
  const existing = await readState(address);
  if (existing && existing.expiresAt > now && now - existing.sentAt < RESEND_AFTER_MS) {
    return { emailHint: maskEmail(address), sent: false };
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  await writeState(
    address,
    { hash: hashCode(code), attempts: 0, sentAt: now, expiresAt: now + CODE_TTL_SECONDS * 1000 },
    CODE_TTL_SECONDS
  );

  try {
    await sendDynamicEmailService({
      recipient: { email: address, name: name || 'Ensemble staff' },
      subject: 'Your Ensemble staff sign-in code',
      content: [
        `Your staff sign-in code is ${code}.`,
        'It expires in 10 minutes. If you did not just try to sign in, change your password and tell an admin.',
      ],
    });
  } catch (err) {
    await clearState(address);
    console.error('Staff sign-in code email failed:', err.message);
    throw new ServiceError("We couldn't email your sign-in code. Try again in a moment.", 502);
  }

  return { emailHint: maskEmail(address), sent: true };
}

/** @returns {Promise<{ ok: boolean, message?: string }>} */
async function verifyStaffEmailCode({ email, code }) {
  const address = String(email || '').trim().toLowerCase();
  const submitted = String(code || '').trim();
  const now = Date.now();
  const state = await readState(address);

  if (!state || state.expiresAt <= now) {
    await clearState(address);
    return { ok: false, message: 'Your sign-in code expired. Go back and sign in again to get a new one.' };
  }

  const matches =
    /^\d{6}$/.test(submitted) &&
    crypto.timingSafeEqual(Buffer.from(hashCode(submitted), 'hex'), Buffer.from(state.hash, 'hex'));
  if (matches) {
    await clearState(address);
    return { ok: true };
  }

  const attempts = (Number(state.attempts) || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await clearState(address);
    return { ok: false, message: 'Too many incorrect codes. Go back and sign in again to get a new one.' };
  }
  await writeState(address, { ...state, attempts }, (state.expiresAt - now) / 1000);
  const left = MAX_ATTEMPTS - attempts;
  return { ok: false, message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` };
}

module.exports = {
  issueStaffEmailCode,
  verifyStaffEmailCode,
  maskEmail,
};
