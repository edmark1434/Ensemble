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
