/**
 * When an approved marketplace listing goes live. Staff pick one of `PUBLISH_MODES`:
 * `now`, `24h`, `7d`, or `date` with an ISO `publishAt`. Anything but `now` stores the listing
 * as `scheduled` until the go-live job publishes it (see MarketplaceListingReviewServices).
 */

const PUBLISH_MODES = Object.freeze(['now', '24h', '7d', 'date']);

const HOUR_MS = 60 * 60 * 1000;
/** A chosen date must leave the job time to run and staff time to undo it. */
const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * HOUR_MS;

function scheduleError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = 'LISTING_PUBLISH_TIME_INVALID';
  return err;
}

/**
 * @param {{ publishMode?: string|null, publishAt?: string|null }} input
 * @param {Date} [now]
 * @returns {{ mode: string, publishAt: Date|null }} `publishAt` is null for `now`.
 */
function resolvePublishSchedule({ publishMode, publishAt } = {}, now = new Date()) {
  const mode = publishMode == null || publishMode === '' ? 'now' : String(publishMode).toLowerCase();
  if (!PUBLISH_MODES.includes(mode)) {
    throw scheduleError('Pick when the listing goes live: now, in 24 hours, in 7 days, or a date.');
  }
  const base = now.getTime();
  if (mode === 'now') return { mode, publishAt: null };
  if (mode === '24h') return { mode, publishAt: new Date(base + 24 * HOUR_MS) };
  if (mode === '7d') return { mode, publishAt: new Date(base + 7 * 24 * HOUR_MS) };

  const at = new Date(publishAt || '');
  if (!publishAt || Number.isNaN(at.getTime())) {
    throw scheduleError('Pick a valid go-live date and time.');
  }
  const lead = at.getTime() - base;
  if (lead < MIN_LEAD_MS) throw scheduleError('Pick a go-live time at least 5 minutes from now.');
  if (lead > MAX_LEAD_MS) throw scheduleError('Pick a go-live time within the next 365 days.');
  return { mode, publishAt: at };
}

module.exports = { PUBLISH_MODES, resolvePublishSchedule };
