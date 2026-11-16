// In-process traffic monitor for the API rate limiter (admin Analytics → Traffic).
// Transient by design: it covers this process only and resets on restart.
// Enforced counters live in Redis (`rate-limit:v2:*`); this only observes decisions.

const MINUTE_MS = 60 * 1000;
const HISTORY_MINUTES = 60;
const MAX_EVENTS = 200;
const MAX_SUBJECTS = 5000;
const REPEAT_WINDOW_MS = 60 * 1000;

const startedAt = Date.now();
const minutes = new Map(); // minute start (ms) -> { allowed, blocked, policies: { [name]: { allowed, blocked } } }
const subjects = new Map(); // Redis bucket key -> live usage entry
const events = []; // newest first, blocked requests only
const totals = { allowed: 0, blocked: 0 };
const storeErrors = { count: 0, lastAt: null, lastMessage: null };

function minuteBucket(now) {
  const start = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  let bucket = minutes.get(start);
  if (!bucket) {
    bucket = { allowed: 0, blocked: 0, policies: {} };
    minutes.set(start, bucket);
    const cutoff = start - HISTORY_MINUTES * MINUTE_MS;
    for (const key of minutes.keys()) {
      if (key <= cutoff) minutes.delete(key);
    }
  }
  return bucket;
}

function pruneSubjects(now) {
  for (const [key, entry] of subjects) {
    if (entry.resetAt <= now) subjects.delete(key);
  }
  // Still too many live buckets: drop the least recently seen.
  if (subjects.size > MAX_SUBJECTS) {
    const overflow = [...subjects.values()]
      .sort((a, b) => a.lastSeen - b.lastSeen)
      .slice(0, subjects.size - Math.floor(MAX_SUBJECTS * 0.9));
    for (const entry of overflow) subjects.delete(entry.key);
  }
}

function trackBucket(bucket, decision, request, now) {
  let entry = subjects.get(bucket.key);
  if (!entry || entry.resetAt <= now) {
    entry = { key: bucket.key, policy: decision.policy, scope: bucket.scope, subject: bucket.subject, blocked: 0, firstSeen: now };
    subjects.delete(bucket.key);
    subjects.set(bucket.key, entry);
  }
  entry.label = decision.label || entry.label || null;
  entry.ip = decision.ip;
  entry.count = bucket.count;
  entry.limit = bucket.limit;
  entry.windowMs = bucket.windowMs;
  entry.resetAt = bucket.resetAt;
  entry.lastSeen = now;
  entry.lastRequest = request;
  if (bucket.blocked) entry.blocked += 1;
  return entry;
}

/**
 * One call per request. `buckets` are every counter the request touched (account, or
 * browser + network); `blockedBy` is the bucket that returned 429, if any.
 */
function recordDecision(decision) {
  const now = Date.now();
  const { policy, blockedBy } = decision;
  const field = blockedBy ? 'blocked' : 'allowed';
  const request = `${decision.method} ${decision.path}`;

  const bucket = minuteBucket(now);
  bucket[field] += 1;
  const perPolicy = bucket.policies[policy] || (bucket.policies[policy] = { allowed: 0, blocked: 0 });
  perPolicy[field] += 1;
  totals[field] += 1;

  const entries = decision.buckets.map((b) => trackBucket(b, decision, request, now));
  if (subjects.size > MAX_SUBJECTS) pruneSubjects(now);

  if (!blockedBy) return;
  const entry = entries[decision.buckets.indexOf(blockedBy)];
  const latest = events[0];
  // A client retrying after a 429 would otherwise flood the log with one row per retry.
  if (latest && latest.key === blockedBy.key && latest.request === request && now - latest.lastAtMs < REPEAT_WINDOW_MS) {
    latest.repeats += 1;
    latest.lastAtMs = now;
    latest.lastAt = new Date(now).toISOString();
    latest.count = blockedBy.count;
    return;
  }
  events.unshift({
    key: blockedBy.key,
    at: new Date(now).toISOString(),
    lastAt: new Date(now).toISOString(),
    lastAtMs: now,
    repeats: 1,
    policy,
    scope: blockedBy.scope,
    subject: blockedBy.subject,
    label: blockedBy.scope === 'account' ? entry.label : null,
    ip: decision.ip,
    request,
    count: blockedBy.count,
    limit: blockedBy.limit,
  });
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

function recordStoreError(message) {
  storeErrors.count += 1;
  storeErrors.lastAt = new Date().toISOString();
  storeErrors.lastMessage = String(message || 'Unknown error').slice(0, 200);
}

function forgetSubject(key) {
  subjects.delete(key);
}

function getSnapshot({ activeLimit = 50, eventLimit = 100 } = {}) {
  const now = Date.now();
  pruneSubjects(now);

  const currentMinute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  const history = [];
  const policyTotals = {};
  let lastHourAllowed = 0;
  let lastHourBlocked = 0;
  for (let i = HISTORY_MINUTES - 1; i >= 0; i -= 1) {
    const start = currentMinute - i * MINUTE_MS;
    const bucket = minutes.get(start);
    history.push({ minute: new Date(start).toISOString(), allowed: bucket?.allowed || 0, blocked: bucket?.blocked || 0 });
    if (!bucket) continue;
    lastHourAllowed += bucket.allowed;
    lastHourBlocked += bucket.blocked;
    for (const [name, counts] of Object.entries(bucket.policies)) {
      const row = policyTotals[name] || (policyTotals[name] = { allowed: 0, blocked: 0 });
      row.allowed += counts.allowed;
      row.blocked += counts.blocked;
    }
  }

  const live = [...subjects.values()];
  const active = live
    .map((entry) => ({
      key: entry.key,
      policy: entry.policy,
      scope: entry.scope,
      subject: entry.subject,
      label: entry.scope === 'account' ? entry.label : null,
      ip: entry.ip,
      count: entry.count,
      limit: entry.limit,
      usagePct: entry.limit > 0 ? Math.round((entry.count / entry.limit) * 100) : 0,
      blocked: entry.blocked,
      resetsAt: new Date(entry.resetAt).toISOString(),
      lastSeen: new Date(entry.lastSeen).toISOString(),
      lastRequest: entry.lastRequest,
    }))
    .sort((a, b) => b.usagePct - a.usagePct || b.count - a.count)
    .slice(0, activeLimit);

  // Many accounts or browsers behind one address means a shared network (or a proxy
  // whose address is being used instead of the visitor's).
  const byIp = new Map();
  for (const entry of live) {
    if (!entry.ip) continue;
    const row = byIp.get(entry.ip) || { ip: entry.ip, accounts: new Set(), devices: new Set(), signedOutRequests: 0, highestCeilingPct: 0 };
    if (entry.scope === 'account') row.accounts.add(entry.subject);
    else if (entry.scope === 'device') row.devices.add(entry.subject);
    else {
      row.signedOutRequests += entry.count;
      if (entry.limit > 0) row.highestCeilingPct = Math.max(row.highestCeilingPct, Math.round((entry.count / entry.limit) * 100));
    }
    byIp.set(entry.ip, row);
  }
  const sharedIps = [...byIp.values()]
    .map((row) => ({
      ip: row.ip,
      accounts: row.accounts.size,
      devices: row.devices.size,
      signedOutRequests: row.signedOutRequests,
      highestCeilingPct: row.highestCeilingPct,
    }))
    .filter((row) => row.accounts + row.devices > 1)
    .sort((a, b) => b.accounts + b.devices - (a.accounts + a.devices) || b.signedOutRequests - a.signedOutRequests)
    .slice(0, 10);

  return {
    startedAt: new Date(startedAt).toISOString(),
    generatedAt: new Date(now).toISOString(),
    totals: { ...totals },
    lastHour: { allowed: lastHourAllowed, blocked: lastHourBlocked },
    currentMinute: history[history.length - 1],
    history,
    policyTotals,
    liveBuckets: {
      total: live.length,
      accounts: new Set(live.filter((e) => e.scope === 'account').map((e) => e.subject)).size,
      devices: new Set(live.filter((e) => e.scope === 'device').map((e) => e.subject)).size,
      ips: new Set(live.filter((e) => e.scope === 'ip').map((e) => e.subject)).size,
      nearLimit: live.filter((e) => e.limit > 0 && e.count / e.limit >= 0.8).length,
      blocked: live.filter((e) => e.count > e.limit).length,
    },
    active,
    sharedIps,
    events: events.slice(0, eventLimit).map(({ lastAtMs, ...event }) => event),
    storeErrors: { ...storeErrors },
  };
}

module.exports = { recordDecision, recordStoreError, forgetSubject, getSnapshot };
