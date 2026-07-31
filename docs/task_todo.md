# Reddit Forums TODO

Last updated: 2026-07-31

Status legend:

- [x] Completed and verified
- [ ] Not implemented
- [~] Partially implemented or broken
- [!] Blocked or requires clarification

## Audit Summary

- The existing forum architecture is `Route -> Controller -> Service -> Repository`, with forum data in MongoDB. The forum router is registered through `backend/Route/api.js`.
- Groups and discussions already have route, controller, service, and repository layers. The user forum UI is primarily implemented in `Forums.tsx` and `SelectedGroup.tsx`.
- Phase 1 discussion mutations now derive actor identity from the authenticated session. Create requires active group membership, while edit/delete require the author, a group Admin/Moderator, or an authorized staff moderator.
- Phase 1 uses the existing MongoDB-compatible `content` and `imageKeys` fields. Discussion S3 uploads continue to use the existing pre-signed upload flow and store object keys only.
- `ExpandDiscussion.tsx` now loads the existing discussion and group APIs and uses the same persisted threaded-comment behavior as the forum feed and group page.
- Forum pages do not emit or subscribe to forum-specific WebSocket events. The existing Socket.IO implementation currently covers chat and notification read-state events.
- Forum services do not create PostgreSQL notifications.
- PostgreSQL report read/moderation infrastructure exists, but the user-facing forum report modals only log and show success toasts; they do not persist reports.
- Moderator screens exist for forum overview, groups, discussions, comment removal, reports, and account restrictions. Some moderator controllers call repositories directly instead of using a service layer.
- No application code was changed during this audit.

## Phase 1 - Stabilize Core Discussions

- [x] Create discussion
  - Authenticated route, active-group membership validation, session-derived author ID, MongoDB persistence, and existing S3 `imageKeys` upload flow are connected.
- [x] Edit discussion
  - `content`, tags, and `imageKeys` are persisted through the existing layers. Author, group Admin/Moderator, and authorized staff moderator permissions are enforced. Both live forum pages call the API and reconcile with the returned document.
- [x] Delete discussion
  - Both live forum pages call the existing endpoint. The service enforces permissions, and the repository performs a backward-compatible soft delete using `deleted_at`.
- [x] Like discussion
  - Actor identity is session-derived, duplicate likes are prevented, and optimistic updates/rollbacks use stable MongoDB discussion IDs.
- [x] Save discussion
  - Actor identity is session-derived, duplicate saves are prevented, and optimistic updates/rollbacks use stable MongoDB discussion IDs.

### Phase 1 Validation

- Backend syntax checks passed for the forum route, controller, service, and repository.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production build passed with `vite build`.
- Active discussion reads now exclude soft-deleted and moderator-removed discussions.

## Phase 2 - Complete Threaded Conversations

- [x] Nested comments
  - Discussion existence and active-group membership are validated before creation. Comment attachments use the existing pre-signed S3 upload endpoint and store object keys in the existing embedded schema.
- [x] Nested replies
  - Parent comments are validated within the target discussion. Arbitrary depth remains represented by `comment_reference_id` and is rendered consistently by the shared tree builder.
- [x] Edit reply
  - Reply/comment authors, group Admins/Moderators, and authorized staff moderators can edit through the existing authenticated endpoint. `Forums.tsx`, `SelectedGroup.tsx`, and `ExpandDiscussion.tsx` are connected.
- [x] Delete reply
  - Authorized deletion soft-deletes the targeted node and clears its attachments while preserving its ID and parent link, so all descendants remain attached and visible under a `[deleted]` placeholder.
- [x] Comment reactions
  - Like/unlike actors are derived from the authenticated session, duplicate reactions are prevented, and all three forum pages use persisted optimistic behavior with stable discussion/comment IDs.

### Phase 2 Validation

- Backend syntax and module-load checks passed for the forum controller, service, repository, and route.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production build passed with `vite build`.
- `git diff --check` passed.
- WebSocket events and notifications were intentionally not added in Phase 2.

## Phase 3 - Build Scalable Feeds

- [x] Backend pagination
  - Global, group, current-user, public-user, and saved discussion feeds share an opaque compound cursor contract and return `{ discussions, pagination: { nextCursor, hasMore } }`.
  - Page size defaults to 10 and is bounded from 1 to 50. Active-feed filters exclude soft-deleted and moderator-removed discussions.
- [x] Infinite scrolling
  - `Forums.tsx` and `SelectedGroup.tsx` append pages through intersection sentinels while preventing concurrent page loads.
- [x] Latest feed
  - MongoDB ranks by `created_at` and `_id`, both descending, for stable cursor traversal.
- [x] Trending feed
  - MongoDB computes an engagement score from discussion likes, comments, and saves, with `_id` as the stable tie-breaker.
- [x] Hot feed
  - MongoDB uses a Reddit-style score combining logarithmic engagement with a creation-time boost.
- [x] User profile feed
  - Current-user and profile-scoped endpoints use the shared pagination and ranking contract.
- [x] Saved feed
  - The authenticated saved feed uses the same pagination/ranking contract and consistent session-derived user identity.

### Phase 3 Validation

- Backend syntax checks passed for the discussion route, controller, service, and repository.
- Read-only MongoDB integration checks passed for latest, trending, and hot first/next pages with no cursor overlap.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production bundling passed with `vite build`.
- `git diff --check` passed.
- Reporting, realtime, notifications, moderation, and unrelated feeds were not changed during this phase.

## Phase 4 - Safety and Moderation

- [x] Moderator tools
  - Forum moderator routes and screens exist for overview, reports, groups, discussions, comment removal, tickets, violations, and account restrictions.
  - Forum moderator controllers now use a service boundary. Active forum reads exclude inactive/deleted groups, and group management mutations are authorized in the service layer.
- [x] Report content
  - Authenticated group and group-member report endpoints validate the MongoDB target, resolve reporter/target PostgreSQL accounts, prevent self-reports, and persist into the existing PostgreSQL `reports` table.
  - The existing group/member report modals now await the persisted API result, retain input on failure, and feed the existing Forum Moderator report queue through the shared report repository.
- [x] Ban member
  - Group bans are stored compatibly on embedded members, can be applied or reversed by group managers and forum moderators, and are enforced for membership, posting, reactions, and group management.
  - Group roles and member removal use authenticated service-layer endpoints; only group admins can assign roles.
- [x] Lock discussion
  - Forum moderators can lock/unlock from the existing discussion screen. Locked discussions reject new comments/replies from ordinary members while retaining moderator/group-manager access.
- [x] Sticky discussion
  - Forum moderators can sticky/unsticky from the existing discussion screen. Sticky discussions sort before ordinary discussions while retaining stable cursor pagination.

### Phase 4 Reporting Validation

- Backend syntax checks passed for the forum report controller, service, shared repository, moderator repository, and route.
- Backend report modules loaded successfully; the process then remained active because the local Redis dependency was unavailable and retrying.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production bundling passed with the existing `build:force` script. The default build script remains blocked by its unrelated unsupported `--warnInverted` Vite flag.
- `git diff --check` passed.

### Remaining Moderator Features Validation

- Backend syntax checks passed for the forum group, discussion, and moderator Route/Controller/Service/Repository files.
- Forum group, discussion, and moderator service modules loaded successfully.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production bundling passed with the existing `build:force` script.
- `git diff --check` passed.

## Phase 5 - Realtime and Notifications

- [x] WebSocket improvements
  - The existing Socket.IO server now supports global, group, and discussion forum rooms.
  - Persisted group, discussion, comment, reply, like, and save mutations emit scoped `forum:event` messages. All three forum pages subscribe through one shared client hook and reconcile through their existing API reads.
  - Two authenticated Socket.IO clients successfully received the same scoped discussion event.
  - [!] Two-browser UI acceptance testing is blocked because the available browser clients have no authenticated Ensemble session and are redirected to the landing page.
- [x] Optimistic updates
  - Likes, saves, and comment reactions update locally with rollback using stable MongoDB IDs.
  - Persisted forum WebSocket events trigger API reconciliation across forum views, avoiding filtered-index mutation.
- [x] Notification improvements
  - Comment, reply, mention, discussion-like, discussion-save, and comment/reply-like notifications use the existing PostgreSQL notification service.

### Phase 5 Realtime Validation

- Backend syntax checks passed for `lib/websocket.js` and both forum services.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production bundling passed with `vite build`.
- `git diff --check` passed.
- Two-client room fan-out passed against the real Socket.IO implementation.
- Feeds and notifications were intentionally not changed.

## Phase 7 - Forum Notifications

- [x] Comment notification
  - A persisted top-level comment notifies the discussion author through the existing PostgreSQL notification service and notification WebSocket event.
- [x] Reply notification
  - A persisted reply notifies the immediate parent-comment author.
- [x] Mention notification
  - Up to ten unique `@handle` mentions are resolved case-insensitively through the existing account repository and notified with a discussion-detail reference.
- [x] Prevent self-notifications
  - The acting user is excluded from comment, reply, and mention recipients. A primary comment/reply recipient is also deduplicated from mentions on the same submission.

### Phase 7 Validation

- Backend syntax checks passed for the forum discussion service and account repository.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production bundling passed with `vite build`.
- `git diff --check` passed.
- Feeds, reactions, and unrelated notification flows were not changed.

## Prioritized Implementation Roadmap

1. **Secure and normalize existing mutations**
   - Add the existing session/auth middleware to discussion creation.
   - Derive actor IDs from the session in controllers/services.
   - Add owner/admin/moderator authorization for discussion and comment edits/deletes.
   - Standardize `content`/`description` and `attachments` payload mapping without changing the stored MongoDB model unnecessarily.
   - Filter deleted/removed content consistently in forum repositories.

2. **Make core discussion flows consistent across views**
   - Connect `Forums.tsx` edit/delete actions to the existing endpoints.
   - Replace the mocked `ExpandDiscussion.tsx` data and handlers with existing forum APIs.
   - Fix state updates to identify posts by MongoDB `_id`, not filtered array index.
   - Reuse the `CreateGroupModal` pre-signed S3 flow for discussion, comment, and reply attachments; store only S3 keys.

3. **Finish threaded comments and replies**
   - Validate parent comment references in the service.
   - Define parent-delete behavior that preserves or intentionally removes descendants.
   - Wire edit/delete/reaction behavior consistently in all three forum views.

4. **Add forum reporting using existing PostgreSQL infrastructure**
   - Reuse the existing `reports` schema and report repositories/services.
   - Add authenticated forum report submission routes through the existing route convention.
   - Connect group, discussion, comment, reply, and supported user report UI to persistence.

5. **Add query-backed feeds and pagination**
   - Introduce a shared cursor/page contract in the existing discussion layers.
   - Implement group, saved, user, latest, trending, and hot queries in repositories.
   - Add infinite-scroll UI after backend pagination is stable.

6. **Add forum WebSocket events and reconciliation**
   - Reuse the current Socket.IO server.
   - Add scoped group/discussion rooms and emit create/update/delete/reaction/member events from services.
   - Reconcile optimistic state using stable IDs and server payloads.

7. **Add forum notifications**
   - Reuse existing PostgreSQL notification services/repositories.
   - Create notifications from forum services for comments, replies, mentions, and later reactions.
   - Avoid self-notifications and duplicate notifications.

8. **Complete moderation controls**
   - Add service-layer orchestration for forum moderator actions.
   - Implement group-scoped member bans and enforcement.
   - Add lock and sticky fields, repository operations, service authorization, routes, and moderator UI.

## Verification Needed During Implementation

- Add focused service/repository tests for authorization, payload mapping, nested replies, ranking, pagination, reports, and notification deduplication.
- Run frontend type-check/lint and backend tests after each small phase.
- Verify MongoDB and PostgreSQL integration with configured local test databases.
- Verify S3 pre-signed uploads store object keys rather than blob URLs or full URLs.
- Verify two-client Socket.IO behavior for every new forum event.

## Forum UX and Realtime Reconciliation

- [x] Mutation-local updates
  - Forum discussion, comment, reply, reaction, like, and save mutations update the affected local record by MongoDB `_id` and `comment_id` without replacing loaded pages or triggering page skeletons.
  - Optimistic likes, saves, and reactions retain rollback behavior, and comment composers retain their content after failed submissions.
- [x] Realtime local reconciliation
  - The shared forum Socket.IO hook subscribes once per scope and reconciles create, update, delete, reaction, like, and save events without feed refetches.
  - Sender echo events are deduplicated by stable discussion/comment IDs.
- [x] Global create-discussion destination
  - A session-derived joined-groups endpoint supplies active memberships to the global modal.
  - The modal requires an explicit group, resets and loads that group's tags, preserves S3 object-key uploads, prevents duplicate submission, and closes only after success.
- [x] Forum search null safety
  - Forum group, title, content, and description searches normalize missing values before case-insensitive matching.

### Forum UX Validation

- Backend syntax checks passed for the joined-group Route/Controller/Service changes.
- Frontend TypeScript check passed with `tsc --noEmit`.
- Frontend production bundling passed with `build:force`.
- `git diff --check` passed.

## Forum Identity, Threads, Reports, and Reactions

- [x] Real forum identities
  - The signed-in user's forum avatar uses the same current-avatar endpoint as the navigation header.
  - Discussion and comment authors resolve display names and stored avatar paths through the existing user-details/profile infrastructure instead of UUID labels.
  - Group pages resolve identities for non-member participants separately from membership data, including newly received realtime comments.
- [x] Collapsible threaded replies
  - Replies start collapsed behind a reply-count preview and expand beneath their parent along the existing connector line.
  - Fixed the group-page collapsed state so every parent with children exposes a working View/Hide replies control at every nesting depth.
- [x] Discussion reporting
  - Non-authors can report discussions from the feed or detail view through the existing PostgreSQL reports table and moderator queue.
  - The selected-group discussion list also exposes the report action beside every discussion owned by another user.
- [x] Group posting membership UX
  - The selected-group page hides the New Discussion action and modal for non-members and banned members; the create handler retains a membership guard in addition to backend enforcement.
  - Authenticated non-members may still comment, reply, like, save, and react in active groups. Group bans continue to block those interactions.
- [x] Reaction notifications
  - New discussion likes, saves, and comment/reply likes create persisted notifications, while self-actions, removals, and duplicate reactions do not.
