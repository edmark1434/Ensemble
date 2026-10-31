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
