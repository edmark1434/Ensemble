const crypto = require('crypto');
const redisClient = require('../lib/Redis');

async function verifyDiditWebhook(req, res, next) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  const signature = req.get('x-signature');
  const timestamp = Number(req.get('x-timestamp'));
  if (!secret || !signature || !Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300 || !Buffer.isBuffer(req.rawBody)) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature.', code: 'INVALID_WEBHOOK_SIGNATURE' });
  }
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature.', code: 'INVALID_WEBHOOK_SIGNATURE' });
  }
  const deliveryKey = `webhook-dedupe:didit:${crypto.createHash('sha256').update(signature).digest('hex')}`;
  const accepted = await redisClient.set(deliveryKey, '1', { NX: true, EX: 24 * 60 * 60 });
  if (!accepted) return res.status(200).json({ success: true, duplicate: true });
  res.on('finish', () => { if (res.statusCode >= 400) redisClient.del(deliveryKey).catch(() => undefined); });
  return next();
}

module.exports = verifyDiditWebhook;
