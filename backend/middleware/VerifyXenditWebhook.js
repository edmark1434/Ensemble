const crypto = require('crypto');
const redisClient = require('../lib/Redis');

async function verifyXenditWebhook(req, res, next) {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  const received = req.get('x-callback-token');
  if (!expected || !received) {
    return res.status(401).json({ success: false, message: 'Invalid webhook token.', code: 'INVALID_WEBHOOK_TOKEN' });
  }
  const a = Buffer.from(String(received));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: 'Invalid webhook token.', code: 'INVALID_WEBHOOK_TOKEN' });
  }
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
  const deliveryKey = `webhook-dedupe:xendit:${fingerprint}`;
  const accepted = await redisClient.set(deliveryKey, '1', { NX: true, EX: 24 * 60 * 60 });
  if (!accepted) return res.status(200).json({ success: true, duplicate: true });
  res.on('finish', () => { if (res.statusCode >= 400) redisClient.del(deliveryKey).catch(() => undefined); });
  return next();
}

module.exports = verifyXenditWebhook;
