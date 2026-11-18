const { insertAccountActiveDay } = require('../repositories/AccountActiveDayRepositories');

/**
 * Records that a member account was active today, for Admin → Analytics (DAU / WAU / MAU,
 * cohort retention). `checkSession` calls this on every authenticated request, so it must
 * stay cheap: each process writes at most one row per account per day and never waits
 * for the write. Staff sessions are not counted.
 */

const MAX_REMEMBERED = 50_000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

let rememberedDay = null;
const seenToday = new Set();
let pausedUntil = 0;
let warned = false;

function dayKey(now) {
  // Throttle key only. The stored day is the database's CURRENT_DATE; a request near
  // midnight may cost one extra no-op insert.
  return new Date(now).toISOString().slice(0, 10);
}

function trackActiveDay(session) {
  if (!session || session.type !== 'User' || !session.account_id) return;
  const now = Date.now();
  if (now < pausedUntil) return;

  const today = dayKey(now);
  if (today !== rememberedDay) {
    rememberedDay = today;
    seenToday.clear();
  }
  const accountId = String(session.account_id);
  if (seenToday.has(accountId)) return;
  if (seenToday.size >= MAX_REMEMBERED) seenToday.clear();
  seenToday.add(accountId);

  insertAccountActiveDay(accountId).catch((err) => {
    seenToday.delete(accountId);
    // Missing table (migration not applied) or a database outage: back off instead of
    // retrying on every request.
    pausedUntil = Date.now() + RETRY_AFTER_FAILURE_MS;
    if (!warned) {
      warned = true;
      console.warn('Active-day tracking paused:', err.message);
    }
  });
}

module.exports = { trackActiveDay };
