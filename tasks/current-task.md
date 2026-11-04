# Current task: Tailor Platform Walkthrough Tracks & Step Scopes

## Objective

Refactor the platform walkthrough steps into 4 distinctly tailored tracks (Freelancer, Client, Asset Creator, Explore All), update dark mode theme styling to neutral dark charcoal, customize perspective instructions, and add the transaction verification & re-entry notice to the completion modal.

## Scope

- `frontend/src/lib/tour_state.ts` (Track step lists, `roleTexts` customization, `getActiveTourSteps`)
- `frontend/src/components/tour/TourSpotlightCard.tsx` (Dynamic `roleTexts` renderer, neutral `#121214` styling)
- `frontend/src/components/tour/TourWelcomeModal.tsx` (Video banner, neutral gray theme, 4 perspective cards)
- `frontend/src/components/tour/TourGraduationModal.tsx` (Verification reminder & multi-perspective walkthrough hint)

## Acceptance criteria

- **Dark Mode Palette**: Completely neutral gray/charcoal (`dark:bg-[#121214]`, `dark:border-zinc-800`), removing blue tinting.
- **Freelancer Track (35 steps)**: Home (Latest Job Posts, Notifications, Ask AI, Profile Avatar), Profile, Projects, Teams, Job Market (bidding/finding jobs), Gigs (posting services), Credits.
- **Client Track (39 steps)**: Home (Global Search, Quick Actions, Top Services, Notifications, Ask AI, Profile Avatar), Profile, Projects, Teams, Discovery (scouting talent), Job Market (posting jobs), Gigs (ordering services), Credits.
- **Asset Creator Track (22 steps)**: Home (Global Search, Quick Actions, Popular Assets, Notifications, Ask AI, Profile Avatar), Profile, Projects, Asset Library (upload -> moderation approval -> earn money), Credits.
- **Explore All Track (62 steps)**: Full walkthrough of all platform capabilities.
- **Graduation Modal**: Notifies user of account verification requirement for transactions (with reassurance for already-verified users) and points to other walkthrough tracks.
- Frontend builds with 0 errors (`npm run build`).

## Concurrent editor task: share links and Asset Library templates

- Share-link promotion objective and acceptance: redeem each signed link's own role by promoting an existing active member only when it outranks their current role (Viewer < Commenter < Editor < Manager < Owner). Persist the promotion in the existing membership so the Share modal and all authorization checks show the same access. Never demote via a link; retain joined_at, current issuer checks and token expiry. Expiry does not undo redeemed membership; a still-valid link may promote a manually demoted member again. Use the existing post-commit access refresh for connected collaborators. No schema changes; source review only, no tests/builds per user instruction. This supersedes the earlier preserve-existing-role behavior below.

- Preview URL protection: replace numeric preview path IDs with authenticated-encrypted, purpose-specific references issued by the template-sharing endpoint. References bind the exact snapshot to the issuing user, expire after 30 days, and retain the current ownership/manager authorization check. Reject numeric/tampered preview paths; carry the opaque reference through the Asset Library and login handoff. No schema changes. Confirmed scene behavior: compact blocks before the project, then load historical block snapshots at or before the saved project snapshot timestamp. Source review only; no tests/builds.
- Route cleanup: use `/preview/:reference`; the `snapshots` path segment was unnecessary. Updated the template modal link. No tests/builds.

- Preview hydration fix: deep-clone each decoded project/scene snapshot before attaching scene content or replacing playback sources/metadata. Yjs can return non-extensible nested JSON values; preview mutations must operate on independent mutable copies. Source review only; no tests/builds per user instruction.

- Preview correction: replace the separate preview UI with the actual Editor component in its existing Viewer mode on `/preview/snapshots/:id`. Hydrate the snapshot and historical scenes locally; preserve the standard navbar, canvas/player controls, panels, timeline, and scene navigation. Disable project/session persistence, collaboration providers, presence/comments sync, role polling, purchases and export-job handling for previews. No tests/builds per user instruction.

- Modal layout/performance follow-up: align Snapshot and Showcase images labels/cards with matching stretched heights. Move scrolling to the form body below a fixed header for both template and media listing modals. Show template handoffs on the first Asset Library render and remove the asset-list loading dependency; display verification/eligibility checking inside the modal and block submission until approved. Ignore stale check results after dismissal. Source review only; no tests/builds per user instruction.

- Follow-up objective: center the primary copy-link button and use view-only/comment-only/edit access/manager access labels; place "or" inside the divider. Label the template attachment Snapshot and add a preview action opening the exact saved snapshot in an authenticated, read-only editor preview, with playback/timeline but no project creation, collaboration session, or persistence. No tests/builds per user preference.
- Follow-up implemented: centered primary button, access-label mapping and shadcn Separator with centered "or". The Snapshot card opens an authenticated standalone editor preview in a new tab. Preview authorization checks current source-project ownership/management, reads the chosen snapshot and historical scene snapshots, and retains existing media-license/missing-media rules. It reuses the editor renderer and read-only timeline, with live scene navigation disabled. Verification: source review only; no tests/builds run.

- Objective: add a role-specific copy-link action below the Share modal's Add as selector, and a bottom action that compacts the current project and opens a dedicated template listing modal in the main Asset Library.
- Acceptance: signed-out link recipients return through main-site login and editor handoff; only authorized owners/managers issue links, and redemption enforces the signed role and current issuer access. Preserve existing member roles. Templates receive a saved snapshot automatically, retain existing listing/upload eligibility checks, and cannot use another user's unauthorized snapshot. No database schema changes. No tests or builds per user instruction.
- Implemented: main-site login/handoff preserves the share token and template destination; role links use a separate derived signing key, expire in 30 days, and recheck issuer membership and role at redemption. Template capture merges persisted and live scene/project state plus the currently open document, compacts snapshots, and opens the dedicated template listing modal in a new tab. The listing backend verifies snapshot project ownership/management. Shared listing fields retain existing upload and moderation behavior. Source review only; no tests/builds run.

## Concurrent editor task: consistent market-original playback delivery

- Objective: use one CloudFront-first signing policy for both the project license batch and individual editor media-source requests.
- Acceptance: preserve signed-session, current project membership, active license, non-deleted original, and asset/media linkage checks; protect redirects with private/no-store; never downgrade a protected original to S3 after a CloudFront signing failure.
- Implementation: market-license-service now owns the shared signer and individual source authorization. The individual source route uses it instead of the backend's S3-only original-preview endpoint. Image, video and audio playback share the same choice of delivery provider.
- Deliberate compatibility: signed S3 remains for disabled CloudFront or legacy files outside asset-originals/, since those paths do not have a signature-enforcing CloudFront behavior. No public-cache signing shortcut or AWS configuration change was made. Standalone marketplace downloads and renderer delivery retain their existing paths.
- Verification: no tests or builds run, per user instruction. No live AWS operations performed.

## Concurrent editor task: export feedback and comment notifications

- Objective: show at least 1% after one second of an active export, and alert the current editor user to replies to their comments and mentions.
- Acceptance criteria: real export progress takes over above 1%; failures/cancellation/queued status retain their existing UI. WebSocket-driven comment refreshes produce a navbar unread count, badges on affected entries/threads, a temporary automatic tooltip, and the main site's notification sound. Clear a thread's unread state only when its floating thread panel is open; viewing the main comments list does not clear it. Suppress self-notifications and duplicate alerts, retain unread state per user and project/scene in this browser, and recover missed changes on reconnect.
- Preserve eager native video playback and the previous CloudFront delivery fixes. No database schema changes.
- Implemented: presentation-only export floor; scoped browser notification checkpoints driven by existing authenticated comment refreshes; navbar count and automatic tooltip; floating-thread acknowledgements and collapsed-reply badges; copied the exact main-site notification sound into editor public assets. Removed automatic acknowledgement based on list-entry visibility.
- Follow-up acceptance and implementation: comment unread badges use the same text-xs size as their surrounding labels. Comment/reply attachment previews preserve natural aspect ratios within the existing size bounds, with no forced 16:9 or cover cropping; pending-upload thumbnails also contain the entire image. Repository files schema has no dimension columns, so this uses intrinsic image dimensions without database changes.
- Navbar positioning: place the unread badge at top-0/right-0, halfway between its original outside offset and the previous inset.
- Centering follow-up: center badge digits in a grid with a one-pixel optical lift and tabular numbers. Presence avatars use fixed 34px circular border boxes with centered full-size contents; align the overflow circle to the same size and optically center initials/counts.
- Circle correction: presence frames now enforce explicit 34px width/height and 1:1 aspect ratio with fixed 32px avatar contents, replacing percentage sizing that could stretch the image.
- Export download follow-up objective and acceptance: retain the automatic download once after completion and keep the Download button reusable after a browser save dialog is cancelled. Treat launching the browser download as requested, not confirmed saved. Invoke existing render-server/S3 cleanup only when closing the completed/expired-output modal (X, Escape, outside dismissal or Close), then reset export state. Closing an active render still only hides its modal. Ignore pending download responses after closing. No tests/builds run.
- Share-modal follow-up objective and acceptance: show the no-email-match hint only after a 500ms typing pause and a successful search for the current input. Ignore superseded search responses, clear stale suggestions immediately, and cancel pending work on close/project change or selecting a person. Implemented without tests/builds per user instruction.
- Canvas loading follow-up objective and acceptance: match timeline media items with solid #2E1D12 orange-brown backgrounds, orange loading text/spinner, and no stripes or dim overlay. Implemented in the shared canvas placeholder while preserving zoom-aware sizing and the existing missing/failed media appearance. No tests or builds run.
- Unread follow-up: persist acknowledgements by individual comment/reply ID when the floating thread opens. Preserve previously known IDs across incomplete refreshes and exclude acknowledged entries from future unread counts. After reading two replies, a third reply in that thread contributes one unread notification.
- Verification: source review only; no tests or builds, per user instruction.
