# Active Task: Editor action toasts

## Implementation Objective

Use the editor's existing Sonner toasts for upload, export, caption, marketplace and upload-trash actions, providing immediate feedback and accurate completion/failure notices.

## Acceptance Criteria

- [x] File/URL uploads announce start, completion and failure; adding more uploads does not restart active uploads.
- [x] Exports announce start, completion and failure; stale or repeated polling results cannot repeat completion notices.
- [x] Caption generation announces start, completion, no speech and failure.
- [x] Likes/saves update optimistically with toasts and rollback on failure.
- [x] Reports and upload trash/restore/permanent deletion announce submission and confirmed results.
- [x] Existing individual and bulk marketplace purchase success toasts remain, without duplicates or optimistic payment claims.
- [x] No builds, type checks, lint, or verification commands run.

---

# Previous Task: Open shared projects from navbar notifications

## Implementation Objective

Make navbar project-invitation notifications use the same browser navigation as Full View so the project handoff opens correctly.

## Acceptance Criteria

- [x] Navbar project-invitation clicks follow the notification's project URL using browser navigation.
- [x] Read marking and popup dismissal remain intact; navigation matches Full View for handoff and absolute URLs.
- [x] No builds, type checks, lint, or verification commands run.

---

# Previous Task: Optimistic project deletion

## Implementation Objective

Remove a project immediately when its trash action is selected, restoring the previous lists if the request fails.

## Acceptance Criteria

- [x] Project actions remove the affected card before awaiting the server.
- [x] Failed requests restore the previous lists and show an error.
- [x] Other projects do not display loading spinners.
- [x] Existing refresh invalidation and permanent-delete confirmation remain intact.
- [x] No builds, type checks, lint, or verification commands run.

---

# Previous Task: Stable template preview URLs

## Implementation Objective

Use `/preview/<market asset UUID>` for published template previews while preserving existing links and private create-template previews.

## Acceptance Criteria

- [x] Main-site and editor template previews open the stable market asset URL.
- [x] Each visit resolves the current published template and retains existing media sanitization and watermarks.
- [x] Legacy encrypted preview links retain their snapshot binding, expiration and access checks.
- [x] Unpublished create-template previews retain their authenticated owner/manager flow.
- [x] No builds, type checks, lint, or verification commands run, per user preference.

---

# Previous Task: Make market audio watermarks audible

## Implementation Objective

Lower the source audio while each Ensemble tag plays and increase the tag volume in generated market audio proxies.

## Acceptance Criteria

- [x] Source audio drops to 20% during the full tag clip, with smooth attack/release ramps.
- [x] Tag gain doubles from 2 to 4; mixed peaks are limited without automatic makeup gain.
- [x] Existing tag timing, original audio, and separate untagged thumbnails are preserved.
- [x] Changes apply to newly generated proxies; existing proxies are not regenerated.
- [x] No builds, type checks, lint, or verification commands run, per user preference.

---

# Previous Task: Project trash and restoration

## Implementation Objective

Add a Trash tab and project-card actions to the main site's Projects list, following the editor upload lifecycle: 30-day recoverable trash, restore, and confirmed permanent deletion.

## Acceptance Criteria

- [x] Grid and compact cards offer owner-only Delete, or Restore / Delete forever in Trash.
- [x] Active lists exclude trash; Trash shows the owner's recoverable projects and deletion dates.
- [x] Backend validates ownership, frozen state, trash transitions, and the 30-day restore deadline.
- [x] Expired trash is permanently marked deleted by background cleanup; reusable uploads remain intact.
- [x] Trashed/deleted projects cannot be opened or edited, and existing editor sessions lose access.
- [x] No builds, type checks, lint, migrations, or verification commands run, per user preference.

## Implementation Notes

- Reuses `projects.trashed_at` from the existing media-asset-trash migration; no new migration.
- UI/API/runtime behavior has not been executed, per the user's verification preference.

---

# Previous Task: Complete the pink comment theme

## Implementation Objective

Finish the existing pink (#f43f5e) accent theme throughout the comments panel, floating thread, and timeline comment-button tooltip.

## Acceptance Criteria

- [x] Panel and thread buttons, mentions, timestamp pills, and focus rings use scoped pink theme colors.
- [x] Portalled filter/sort, mention/timestamp, and entry menus receive the comment theme; selection and hover accents are pink.
- [x] Shared comment tooltips and the timeline comment-button tooltip, including arrows, use the existing pink tooltip style.
- [x] Styling remains scoped to comments, retaining neutral surfaces and destructive/error colors.
- [x] No builds, type checks, lint, or verification commands run, per user preference.

---

# Previous Task: Reveal timeline destinations when navigating

## Implementation Objective

Make comment navigation and other missing timestamp/frame navigation actions scroll the timeline when their destination is offscreen, using the existing marker/caption scroll behavior.

## Acceptance Criteria

- [x] Comment cards, floating-thread timestamp links, ruler comment markers, and the active-comment button reveal their seek destination.
- [x] Previous/next frame or second shortcuts and player seek/seek-by commands reveal their destination.
- [x] Shared navigation helper scrolls to the actual player-clamped frame and leaves already-visible destinations in place.
- [x] Visibility accounts for the canvas's left offset; deferred scrolls ignore a replaced timeline.
- [x] Existing start/end, marker, caption, item-selection, and template navigation keep their scrolling behavior; direct pointer scrubbing remains unchanged.
- [x] No builds, type checks, lint, or verification commands run, per user preference.

---

# Previous Task: Sticky timeline item names

## Implementation Objective

Keep timeline item names at the visible left edge of each clip during horizontal scrolling, matching the existing sticky price behavior.

## Acceptance Criteria

- [x] Video, image, audio, scene, text, and caption labels follow the visible left edge.
- [x] Status icons move with labels; labels remain clipped to their items.
- [x] Positioning uses the current item/group and viewport transforms for scrolling, zooming, and dragging.
- [x] No builds, type checks, lint, or verification commands run; the user handles verification.

---

# Previous Task: Editor timeline tooltip update loop

## Implementation Objective

Fix the maximum update depth error at the timeline comment tooltip trigger by using the corrected tooltip implementation already installed through `radix-ui`.

## Acceptance Criteria

- [x] Shared editor tooltip uses the existing `radix-ui` package and its corrected ref/Popper dependencies.
- [x] Verify tooltip mounting, repeated updates, hover/focus, click, and unmount behavior.
- [ ] Run editor type checking/build and the required frontend build; record any existing blockers.

## Verification

- Editor type check passed (`npm run typecheck`).
- Frontend production build passed (`npm run build`), with existing chunk-size and mixed-import warnings.
- A focused DOM smoke check mounted 100 actual shared tooltip wrappers and verified 20 rerenders while open, stable button identity, focus, click, hover, Escape dismissal, removal/remount, and unmount without runtime errors. The reported crash was not reproduced in isolation with the older implementation; the affected editor project still needs an interactive recheck.
- Editor lint is blocked by the existing `next lint` script: Next.js 16 treats `lint` as a nonexistent project directory.
- Editor production build was stopped at the user's request.

---

# Previous Task: Profile dispute visibility

## Implementation Objective

Remove the public "Under dispute" header badge. Surface open and closed public disputes as profile tabs beside Performance (Active History / Dispute History).

## Acceptance Criteria

- [x] Profile header no longer shows the yellow Under dispute badge
- [x] Active History tab lists open public disputes beside Performance
- [x] Dispute History tab lists closed public disputes beside Performance
- [x] Performance panel no longer needs the footer dispute accordion
- [x] Frontend build passes

---

# Previous Task: One dispute per contract + staff party swap

## Implementation Objective

When one side disputes a contract, the other side can't file a second dispute, and both sides can see that the contract is already disputed. Staff can swap the disputer and disputee when the case was filed by the wrong side.

## Acceptance Criteria

- [x] `active_dispute` reaches the disputee too (private case: no id/number leaked)
- [x] Contract card, contract page and actions menu show "already disputed" and hide Report a Dispute
- [x] Dispute form marks disputed contracts in the picker, shows a banner, and blocks submit (backend 409 still enforced)
- [x] `swap_parties` staff action swaps the parties in Postgres and flips the Mongo message audiences/roles atomically
- [x] Swap posts a "Parties swapped" notice card, notifies both parties, logs activity
- [x] Staff modal: Parties section labels client/freelancer and offers Swap with a confirm dialog
- [x] Frontend build passes
- [ ] Manual test against a non-production DB + Mongo: file dispute as client, check freelancer view, swap, check message visibility
