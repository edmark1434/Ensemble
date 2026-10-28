# Completed task: Load licensed marketplace originals directly from storage

## Acceptance criteria
- Verify the signed editor session and backend project/license permission before returning original access.
- Redirect authorized media requests to temporary storage URLs without downloading or relaying media on the editor server.
- Keep redirects non-cacheable, preserve range requests, and obtain fresh links on subsequent source requests.
- Keep signed URLs out of project history and preserve existing unrelated changes.

## Implementation
- Replaced the source route's media fetch/stream with a private, no-store 307 redirect after the existing authorization check.
- The playback hook continues using the stable editor endpoint; no signed URLs are stored in project state.
- Verification: 7 source-route regression tests, 2 free-license tests, and 12 backend marketplace action tests passed; editor `npm run typecheck` and `git diff --check` passed.
- Route checks cover direct redirects without server media fetches, fresh authorization/links on later range requests, revoked/denied access, invalid media IDs, and missing signed URLs.
- Live browser transfer timings, visual checks, and render-server testing were not run. No production build was run for this route-only change.
