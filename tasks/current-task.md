# Active Task: Fix IDE SQL inspection errors in upload trash and asset queries

## Objective

Replace raw Kysely expression fragments with typed query-builder expressions, preserving database time and 30-day retention behavior. Verify the trash columns and address the IDE's stale schema warning.

## Acceptance criteria

- [x] Verified public.media_assets.trashed_at and public.projects.trashed_at exist in the configured database.
- [x] Trash timestamps, cutoff, remaining-day calculation, and showcase predicate use Kysely expressions instead of SQL fragments.
- [x] Suppress the stale SqlResolve warning only on the verified retention query, with migration reference.
- [x] Editor TypeScript check passes.

## Verification

Read-only database schema check, editor TypeScript check, and diff whitespace check passed. No test suites or database mutations.
