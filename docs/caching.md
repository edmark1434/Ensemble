# Caching and Transient State

## Principles

- PostgreSQL/MongoDB are authoritative unless a feature explicitly defines another source of truth.
- Redis and in-memory state are accelerators or transient coordination mechanisms, not durable business records.
- Every cached value needs an owner, key format, TTL policy, and invalidation rule.

## Key design

- Namespace keys by environment and feature.
- Include stable resource/user IDs rather than display names.
- Version key formats when changing serialized shapes.
- Never cache secrets, raw OAuth tokens, passwords, or unnecessary payment/identity data.

## Invalidation

- Prefer write-through invalidation immediately after a successful database commit.
- Emit realtime changes only after durable state succeeds.
- On cache failure, serve authoritative data where safe rather than corrupting state.
- Prevent stampedes for expensive shared reads with bounded TTLs/locking where needed.

## Platform settings

- `getSectionValue` (`backend/repositories/AdminSettingsRepositories.js`) caches each `configuration` section in process memory for 15 seconds (`SETTINGS_CACHE_TTL_MS`; `0` disables it). Concurrent readers share one query, and callers receive a clone.
- `updateSettingsSection` reads the section uncached and clears the cache after writing. Other processes and raw SQL edits are picked up within the TTL.
- Request paths seed default configuration rows once per process. `lib/Seed.js` still calls `ensureDefaultSettings` directly.

## Staff console data (browser)

- `frontend/src/lib/staffCache.ts` keeps the last successful response of each staff page/tab GET in memory, keyed by URL plus sorted params. There is no storage persistence and no TTL. Pages render the cached response, then always refetch on mount. Identical in-flight GETs are shared.
- Any non-GET request through the shared `api` client (including logout) clears the cache, as does a change of signed-in staff identity. Responses that started before a clear are not stored.
- `frontend/src/lib/staffPrefetch.ts` maps sidebar routes and data-owning tabs to their first-mount GETs. Hover or focus prefetches them unless a response under 15 seconds old or the same request already exists. Keep this map in sync when a page changes what it loads on mount.

## Request-path sweeps

- Dispute auto-assign reconciliation on staff dispute lists runs at most once every 30 seconds per process, and concurrent callers share the in-flight run. The five-minute cron job is unchanged.
- The verification-expiry sweep behind admin user/team lists follows the same 30-second, shared-run rule.

## Presence and realtime state

- Presence requires heartbeat timestamps and expiration; disconnect events alone are unreliable.
- Multiple tabs/devices should be counted or tracked independently so closing one connection does not mark the user offline.
- Clients must recover from missed events by refetching current state.

## Background reconciliation

- Reconciliation scans should be bounded, paginated, rate-limited, and safe to repeat.
- Use provider IDs appropriate to the environment; do not continuously retry records that the provider never accepted.
- Apply backoff and record failure details without leaking credentials or personal data.

## Editor market video playback

- Interactive videos use native `Html5Video` with `preload="auto"` and `pauseWhenBuffering={false}`. Video sequences, their transition groups, and scenes containing videos stay mounted across the timeline. The browser owns streaming and buffering; there is no headless retention player, video blob cache, or video readiness gate. Browser preload remains a hint, not a guaranteed full-file download.
- Images keep their project-scoped decode cache; audio retains `@remotion/media`. Exports keep `OffthreadVideo`. Eager video loading is intentional; lazy loading is deferred.
- Batch-authorized originals use stable exact-file signed S3 URLs by default, or CloudFront when explicitly configured. Stream grants last 55–60 minutes, remain stable across routine checks, and renew in the last minute. They live only in runtime license state. Browser caching is private for five minutes; access denial clears active sources, but previously issued bearer URLs remain usable until expiry.
