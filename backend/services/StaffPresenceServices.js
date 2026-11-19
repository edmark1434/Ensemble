const redisClient = require('../lib/Redis');

/**
 * Staff console presence ("Team on duty").
 *
 * Owner: this service. Key: `presence:staff:v1:<accountId>`, value: ISO time of the last
 * authenticated staff request or console heartbeat. TTL `PRESENCE_TTL_SECONDS`: a staff member
 * whose key has expired is offline. Every tab/device refreshes the same key, so closing one tab
 * never marks the person offline while another is still open. Logout deletes the key.
 *
 * A second key `presence:staff:v1:last:<accountId>` keeps the last-seen time for 30 days so the
 * dashboard can say "last seen 2 hr ago" after the person goes offline.
 */
const PRESENCE_TTL_SECONDS = 150;
const LAST_SEEN_TTL_SECONDS = 30 * 86400;
/** Per-process write throttle per account; well under the TTL so presence never lapses. */
const WRITE_THROTTLE_MS = 30_000;
const MAX_REMEMBERED = 5_000;

const onlineKey = (accountId) => `presence:staff:v1:${accountId}`;
const lastSeenKey = (accountId) => `presence:staff:v1:last:${accountId}`;

const lastWriteAt = new Map();

function staffAccountId(session) {
  if (!session || session.type !== 'Staff') return null;
  const accountId = session.account_id || session.accountId;
  return accountId ? String(accountId) : null;
}

/** Marks the session's staff account online. Fire-and-forget; never throws. */
function touchStaffPresence(session) {
  const accountId = staffAccountId(session);
  if (!accountId) return;
  const now = Date.now();
  if (now - (lastWriteAt.get(accountId) || 0) < WRITE_THROTTLE_MS) return;
  if (lastWriteAt.size >= MAX_REMEMBERED) lastWriteAt.clear();
  lastWriteAt.set(accountId, now);

  const stamp = new Date(now).toISOString();
  Promise.all([
    redisClient.set(onlineKey(accountId), stamp, { EX: PRESENCE_TTL_SECONDS }),
    redisClient.set(lastSeenKey(accountId), stamp, { EX: LAST_SEEN_TTL_SECONDS }),
  ]).catch(() => {
    lastWriteAt.delete(accountId);
  });
}

/** Marks the session's staff account offline right away (logout). */
async function clearStaffPresence(session) {
  const accountId = staffAccountId(session);
  if (!accountId) return;
  lastWriteAt.delete(accountId);
  await redisClient.del(onlineKey(accountId)).catch(() => {});
}

/**
 * @param accountIds {string[]}
 * @returns {Promise<Map<string, { isOnline: boolean, lastSeenAt: string | null }>>}
 */
async function getStaffPresence(accountIds) {
  const ids = [...new Set(accountIds.filter(Boolean).map(String))];
  const entries = await Promise.all(
    ids.map(async (id) => {
      const [online, lastSeen] = await Promise.all([
        redisClient.get(onlineKey(id)).catch(() => null),
        redisClient.get(lastSeenKey(id)).catch(() => null),
      ]);
      return [id, { isOnline: Boolean(online), lastSeenAt: online || lastSeen || null }];
    })
  );
  return new Map(entries);
}

/** Adds `isOnline` / `lastSeenAt` to each roster entry and lists online staff first. */
async function attachStaffPresence(roster) {
  const presence = await getStaffPresence(roster.map((s) => s.accountId)).catch(() => new Map());
  const withPresence = roster.map((s) => {
    const p = presence.get(String(s.accountId)) || { isOnline: false, lastSeenAt: null };
    return { ...s, isOnline: p.isOnline, lastSeenAt: p.lastSeenAt };
  });
  // Stable sort keeps the existing role ordering inside each group.
  return withPresence.sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
}

module.exports = {
  PRESENCE_TTL_SECONDS,
  touchStaffPresence,
  clearStaffPresence,
  getStaffPresence,
  attachStaffPresence,
};
