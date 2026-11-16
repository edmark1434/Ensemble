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

function recordDecision(decision) {
  const now = Date.now();
  const { key, policy, blocked } = decision;
  const field = blocked ? 'blocked' : 'allowed';

  const bucket = minuteBucket(now);
  bucket[field] += 1;
  const perPolicy = bucket.policies[policy] || (bucket.policies[policy] = { allowed: 0, blocked: 0 });
  perPolicy[field] += 1;
  totals[field] += 1;

  let entry = subjects.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { key, policy, scope: decision.scope, subject: decision.subject, blocked: 0, firstSeen: now };
    subjects.delete(key);
    subjects.set(key, entry);
  }
  entry.label = decision.label || entry.label || null;
  entry.ip = decision.ip;
  entry.count = decision.count;
  entry.limit = decision.limit;
  entry.windowMs = decision.windowMs;
  entry.resetAt = decision.resetAt;
  entry.lastSeen = now;
  entry.lastRequest = `${decision.method} ${decision.path}`;
  if (blocked) entry.blocked += 1;
  if (subjects.size > MAX_SUBJECTS) pruneSubjects(now);

  if (!blocked) return;
  const latest = events[0];
  // A client retrying after a 429 would otherwise flood the log with one row per retry.
  if (latest && latest.key === key && latest.request === entry.lastRequest && now - latest.lastAtMs < REPEAT_WINDOW_MS) {
    latest.repeats += 1;
    latest.lastAtMs = now;
    latest.lastAt = new Date(now).toISOString();
    latest.count = decision.count;
    return;
  }
  events.unshift({
    key,
    at: new Date(now).toISOString(),
    lastAt: new Date(now).toISOString(),
    lastAtMs: now,
    repeats: 1,
    policy,
    scope: decision.scope,
    subject: decision.subject,
    label: entry.label,
    ip: decision.ip,
    request: entry.lastRequest,
    count: decision.count,
    limit: decision.limit,
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
      label: entry.label,
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

  // Many signed-in accounts behind one address means a shared network (or a proxy
  // whose address is being used instead of the visitor's).
  const byIp = new Map();
  for (const entry of live) {
    if (!entry.ip) continue;
    const row = byIp.get(entry.ip) || { ip: entry.ip, accounts: new Set(), anonymousRequests: 0, requests: 0 };
    if (entry.scope === 'account') row.accounts.add(entry.subject);
    else row.anonymousRequests += entry.count;
    row.requests += entry.count;
    byIp.set(entry.ip, row);
  }
  const sharedIps = [...byIp.values()]
    .map((row) => ({ ip: row.ip, accounts: row.accounts.size, anonymousRequests: row.anonymousRequests, requests: row.requests }))
    .filter((row) => row.accounts > 1 || row.anonymousRequests > 0)
    .sort((a, b) => b.accounts - a.accounts || b.requests - a.requests)
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
