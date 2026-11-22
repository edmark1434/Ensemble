const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Staff writes (`/admin`, `/moderator`, `/staff`) refresh every staff topic: they are rare and
 * human-paced, and one action can touch several areas (a ban ends listings, an activity
 * reversal undoes anything), so no open console is left stale.
 */
const STAFF_PREFIX = /^\/(admin|moderator|staff)(\/|$)/;

/**
 * Member writes, first match wins. Topics are the areas a staff page shows (see
 * `STAFF_DATA_TOPICS` in lib/WebSocket.js). An empty list means staff desks show nothing it
 * changes, or the write already announces itself (tickets and reports: `staffCaseChanged`).
 */
const MEMBER_RULES = [
  // Sign-in, session upkeep, 2FA and read-only POSTs.
  [/^\/users\/(login|logout|refresh-token|signup-save-session|list-of-details|forgot-password|reset-password|resend-verification-email|2fa)(\/|$)/, []],
  [/^\/accounts\/display-names(\/|$)/, []],
  // Cases announce themselves once saved.
  [/^\/users\/(tickets|reports)(\/|$)/, []],
  [/^\/users(\/|$)/, ['accounts']],
  // Dispute replies and member reports also announce themselves; keep them off `accounts`.
  [/^\/accounts\/disputes(\/|$)/, ['disputes']],
  [/^\/accounts\/[^/]+\/report(\/|$)/, ['reports']],
  [/^\/accounts\/(grant-badge|badges|profile\/badges)(\/|$)/, ['accounts', 'badges']],
  [/^\/accounts\/dev\/add-credits(\/|$)/, ['accounts', 'economy']],
  [/^\/accounts(\/|$)/, ['accounts']],
  [/^\/onboarding(\/|$)/, ['accounts']],
  [/^\/verification(\/|$)/, ['accounts', 'teams']],
  [/^\/(teams|invitations)(\/|$)/, ['teams']],
  [/^\/forum(\/|$)/, ['forum']],
  [/^\/assets(\/|$)/, ['marketplace']],
  [/^\/(jobs|gigs|dashboard)(\/|$)/, ['jobs']],
  // Contracts hold escrow, so the economy desk follows them too.
  [/^\/contracts(\/|$)/, ['jobs', 'economy']],
  [/^\/(payment|subscription|cashouts|transactions)(\/|$)/, ['economy']],
  [/^\/(feedbacks|surveys)(\/|$)/, ['feedback']],
  [/^\/projects(\/|$)/, ['videos']],
];

function topicsForWrite(path) {
  if (STAFF_PREFIX.test(path)) return 'all';
  for (const [pattern, topics] of MEMBER_RULES) {
    if (pattern.test(path)) return topics;
  }
  return [];
}

/**
 * After a write succeeds, tell open staff consoles which areas changed (`staffDataChanged`),
 * so their pages re-read without a reload. Runs once the response is sent, which is after the
 * controller saved the change. Reads, failed writes and unmapped routes emit nothing.
 */
function staffLiveUpdates(req, res, next) {
  if (READ_METHODS.has(req.method)) return next();
  // Nested routers rewrite req.url; the path under /api is read once, here.
  const path = String(req.originalUrl || '')
    .split('?')[0]
    .replace(/^\/api(?=\/|$)/, '')
    .toLowerCase();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const topics = topicsForWrite(path);
    if (topics !== 'all' && !topics.length) return;
    try {
      require('../lib/WebSocket').emitStaffDataChange(topics);
    } catch (error) {
      console.warn('Staff live update skipped:', error.message);
    }
  });
  return next();
}

module.exports = { staffLiveUpdates, topicsForWrite };
