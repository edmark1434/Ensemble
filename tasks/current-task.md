# Active Task: Low-storage indicator and collaborative-project sharing cap

## Implementation Objective

Show the editor storage bar in red-500 at 80% usage or higher. Enforce the database projects plan feature as the maximum number of owned projects shared with other people, and present a limit message with an upgrade button in the Share modal.

## Acceptance Criteria

- Storage bar uses bg-red-500 when actual storagePercent >= 80; otherwise keeps bg-primary.
- Collaborative usage counts distinct non-deleted owned projects with another active member. Retained shared projects in Trash count to prevent restore bypasses; joined projects owned by others do not consume slots.
- Read the project owner's projects feature from their effective plan, supporting nonnegative integers and Unlimited. Managers use the owner's allowance.
- Unshared projects cannot add people or create share links once the owner is at the cap. The Share modal keeps its existing access list, hides those sharing controls, and displays the limit/usage message and an upgrade button linking to the plans page.
- Existing collaborative projects remain shareable because they already consume one slot. Role management, member removal, and sharing a marketplace template remain available under existing permissions.
- Enforce the cap on the editor server for direct additions and share-link redemption inside the same membership transaction. Serialize changes across all of an owner's projects with an advisory transaction lock, plus project row locks.
- Creating a link does not reserve a slot; redemption re-checks capacity. Previously issued links cannot bypass the cap. Existing members redeeming a link retain access.
- Removing the final collaborator releases a slot; additions and removals share the same serialization locks.
- Return a structured 409 for limit failures, preserve generic configuration failures, and display a clear message to recipients of blocked share links. No migration required.
- Preserve unrelated user changes. No builds, type checks, lint, tests, migrations, or verification commands run.

---
# Task History: Render-server dynamic export limit patch

## Implementation Objective

Prepare a patch against the current ensemble-render-server sources to make export resolution and FPS validation use the same database features as the editor. Deliver the patch without applying it or running verification commands.

## Acceptance Criteria

- Patch saved as tasks/render-server-dynamic-export-limits.patch; changes server/render-settings-repository.ts, server/tiers.ts, and server/index.ts.
- Reuse the existing PostgreSQL pool; query export_resolution and export_frame_rate for the trusted render tier on each submission. Map pro to Premium.
- Parse the same resolution and FPS labels as the editor; reject missing, duplicate, or invalid configuration with a generic 503 response. Exceeding a valid plan cap remains 403.
- Skip resolution gating for audio to match the editor. Validate positive FPS and valid image/video resolution values.
- Check the user's active export after the database await and immediately before enqueueing to preserve the single-export rule under concurrent requests.
- Preserve render routing, local concurrency settings, and dynamic Lambda worker/budget behavior. No storage changes, new dependencies, or new environment variables.
- No builds, type checks, lint, tests, migrations, or verification commands run. Patch is prepared, not applied.

---
# Task History: Database-driven editor export and personal upload limits

## Implementation Objective

Use plan_features for export quality, export frame rate, and personal upload storage throughout the editor UI and its server-side export/upload validation. Keep existing render-server and unrelated user changes intact.

## Acceptance Criteria

- Resolve the newest active/trialing, unexpired subscription by user ID; use the actual Free plan when no subscription qualifies.
- Read export_resolution, export_frame_rate, and personal_upload_storage from the selected plan's feature rows, with no hardcoded tier allowances or silent fallbacks.
- Parse quality labels such as 720p / 1080p / 2K / 4K, FPS labels such as 30 fps / 60 fps, and storage quantities using the existing binary unit accounting.
- Export dropdown locks and upgrade badges follow database limits across the three tiers. Include configured caps among selectable presets. Refresh policy when opening the panel, on focus, and periodically.
- Validate export resolution/FPS server-side against freshly loaded limits before preparing assets or submitting to the renderer. Missing or invalid configuration fails closed.
- Presign, URL import, and transactional finalization retain their existing capacity checks with the database storage allowance. The storage meter formats the actual byte limit; zero-capacity plans do not divide by zero.
- Editor video upload normalization uses the shared database resolution cap and accepts validated configured values beyond the old three-value whitelist.
- No builds, type checks, lint, tests, migrations, or verification commands run.

## Scope Limitation

The separate render server's tiers.ts still enforces hardcoded resolution/FPS ceilings. This task changes the editor only; raising database caps above those renderer ceilings requires a companion renderer change. The user reports the dynamic Lambda worker/budget changes were applied in a separate task.

---
# Task History: Dynamic Remotion Lambda worker counts and budgets

## Implementation Objective

Read PostgreSQL directly in the render server for plan worker counts and rendering budgets on all Remotion Lambda paths, including Free overflow. Preserve hardcoded local rendering. The user confirms the render-server folder is included in their Codex project, but this session's direct write was explicitly rejected as outside the project by approval settings. Server changes are prepared in `tasks/render-server-dynamic-lambda.patch`, not applied to the sibling repository.

## Acceptance Criteria

- No new backend endpoint: the previously added internal route, controller, service, and worker query have been removed. The renderer uses its own pg connection pool and repository to read workers and budgets in one SQL snapshot. Existing public plan responses still exclude worker settings.
- Renderer patch declares `AWS_LAMBDA_LIMIT = 1000` and refreshes validated worker counts and budgets every five seconds. Missing/invalid/stale configuration pauses new Lambda starts and preserves local rendering.
- Shared Lambda allocator reserves one invocation for images, two for audio, and plan workers + one orchestrator for video. Paid budget = 1000 - stills/audio budget - Free overflow budget.
- Free overflow uses the Free plan's worker count and overflow budget. Premium and Business share the paid invocation budget. With seed values: 16 Free overflow jobs, 41 Premium jobs or 22 Business jobs; mixed jobs consume their actual invocation costs.
- Budget changes affect new starts. Running jobs keep their original worker count and reservation; reduced budgets wait for existing work to finish. A global invocation cap guards redistribution between lanes.
- Lambda reservations last through terminal progress, including after UI cancellation and transient polling failures. Paid renders await completion instead of releasing their reservation after submission.
- Local `MAX_LOCAL_JOBS = 4`, `PER_JOB_CONCURRENCY = 2`, local rendering logic, and existing tier routing remain hardcoded.
- No builds, tests, lint, type checks, migrations, or verification commands run. Offline dependency lockfile preparation failed because @types/pg was not cached; the original lockfile is preserved. The patch adds pg and @types/pg to package.json; npm install in the renderer remains necessary to install them and update its lockfile.
- Pending: apply the prepared patch when the session has write access to `ensemble-render-server`, install its pg dependency, and configure `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` for the same PostgreSQL database as Ensemble. No credentials were copied or printed. Apply the previous seed migration if still pending, then restart the render server.
- This allocator follows the existing single render-server process model; it does not add distributed scheduling across replicas.

---

# Task History: Refresh subscription plan features and comparison layout

## Implementation Objective

Update the unrun plan feature seed migration and align the tier comparison on `/credits-subscriptions`. Keep editing tools static, and derive queueing and render-speed summaries on the backend from database worker counts and rendering budgets.

## Acceptance Criteria

- Business export quality is `4K` and collaborative projects are `Unlimited`.
- Maximum export frame rate is `30 fps` for Free and `60 fps` for paid tiers.
- Personal upload storage is `5GB` / `100GB` / `1TB` for Free / Premium / Business.
- Remove tools, rendering/export speed, and render queue priority from the database feature catalog.
- Static editing tools summaries show Basic / Basic + Captions.
- The same unrun migration inserts the supplied render_workers feature UUID, plan UUID mappings (2 / 21 / 40 workers), and rendering budget configuration rows (50 / 48); down removes them.
- Backend-only constants set AWS Lambda limit to 1000 and local render slots to 4.
- Paid budget = AWS limit - stills/audio budget - free overflow budget. Free slots = local slots + free overflow budget / (free workers + 1). Paid slots = paid budget / (plan workers + 1) * plan workers.
- Paid queueing displays `Paid queue, up to [throughput]x faster`, where throughput = paid slots / (free slots * free workers). Paid slots already include plan workers, so do not multiply workers again. Round display multipliers to at most two decimal places, without trailing zeros or rounding intermediate calculations: seeded Premium is 21.53x and Business is 22x.
- Render speed displays `up to [speed]x faster`, where speed = plan workers / free workers: seeded Premium is 10.5x and Business is 20x. Format speed to at most two decimals without rounding intermediate calculations. Free summaries remain Shared free queue / Standard.
- Fetch live budget values on each plan request. Invalid/missing inputs show neutral summaries instead of fabricated multipliers.
- Public plan responses exclude render_workers and return only display summaries, never budget values, infrastructure constants, or queue-slot counts. The subscription page also excludes render_workers from its feature list.
- Leave 24px between the final feature row and the desktop action button, matching the divider-to-features spacing; preserve mobile spacing.
- Desktop cards share header, divider, and feature row sizing; missing tier features retain their comparison row.
- Preserve existing migrations and unrelated user edits; provide up/down migration behavior.
- No builds, type checks, lint, migrations, or verification commands run. Database changes require applying the new migration.

---
# Task History: Remove redundant email field from Submit Ticket form & pass account email in payload

## Implementation Objective

Remove the redundant "Email or username" question from the ticket submission form ([`page_SubmitATicket.tsx`](file:///c:/Capstone/Ensemble/frontend/src/pages/landing/pages/page_SubmitATicket.tsx) and [`TicketFormFields.js`](file:///c:/Capstone/Ensemble/backend/lib/TicketFormFields.js)), and pass the authenticated account's email in the payload to `POST /api/users/tickets` so users don't have to manually re-type their email.

## Acceptance Criteria

- [x] Removed `email_or_username` from `TICKET_FORM_FIELDS['Sign-in and password']` and `TICKET_FORM_FIELDS['Account compromised']` in [`backend/lib/TicketFormFields.js`](file:///c:/Capstone/Ensemble/backend/lib/TicketFormFields.js).
- [x] In [`page_SubmitATicket.tsx`](file:///c:/Capstone/Ensemble/frontend/src/pages/landing/pages/page_SubmitATicket.tsx), filter out `email_or_username` and `email` from dynamic fields so it never renders as an editable input.
- [x] In [`page_SubmitATicket.tsx`](file:///c:/Capstone/Ensemble/frontend/src/pages/landing/pages/page_SubmitATicket.tsx), display a clear "Submitting ticket as @handle (email)" badge and include `email: user.email` in the payload sent to `/api/users/tickets`.
- [x] In [`backend/controllers/AdminTicketsControllers.js`](file:///c:/Capstone/Ensemble/backend/controllers/AdminTicketsControllers.js) and [`backend/repositories/AdminTicketsRepositories.js`](file:///c:/Capstone/Ensemble/backend/repositories/AdminTicketsRepositories.js), attach the requester's account email to the ticket submission context.
- [x] `cd frontend && npm run build` passes with zero errors.

---

# Task History: Dynamic Subscription Pricing on Landing Page & Settings

## Implementation Objective

Replace the hardcoded subscription pricing plans on the Landing Page (`/pricing` -> `page_Pricing.tsx`) and User Settings Subscription Details (`user_settings_subscriptiondetails.tsx`) with live data fetched from `GET /api/subscription/plans`, matching the in-app Subscription Pricing page (`CreditsShop.tsx`).

## Acceptance Criteria

- [x] `page_Pricing.tsx` fetches live plans from `GET /api/subscription/plans` and sorts them (`Free` -> `Premium` -> `Business`).
- [x] `page_Pricing.tsx` dynamically renders database plan prices (`formatPHP`), billing period (`/mo`), free-trial badges/notes (`days_of_trials`), and live plan features (`feature.description` + `feature.value`).
- [x] `user_settings_subscriptiondetails.tsx` also fetches from `GET /api/subscription/plans` so all subscription pricing views remain synchronized.
- [x] `cd frontend && npm run build` passes with zero errors.

---

# Task History: IP + Canonical Account Scoped Login Lockout

## Implementation Objective

Fix the login lockout mechanism so failed login attempts and lockouts are scoped by `(Client IP + Canonical Account / Identifier)` rather than globally by the input string alone. This prevents an attacker who knows a user's username or email from locking out the legitimate account owner on another IP, and prevents an attacker on the same IP from getting extra attempts by alternating between username and email.

## Acceptance Criteria

- [x] Failed login attempts and lockout keys in Redis are scoped by normalized client IP (`normalizeLockoutIp`) and canonical target (`acc:<account_id>` for existing accounts, `raw:<identifier>` for unknown identifiers).
- [x] Case-insensitive username and email lookups in `UserRepositories` and `StaffRepositories` resolve consistently to the canonical account.
- [x] Attacker exceeding max attempts from IP A is locked out on IP A for both username and email of that account.
- [x] Legitimate user logging in from IP B is unaffected when IP A is locked out.
- [x] Successful login clears attempt and lockout keys for that IP + account target.

---

# Task History: One dispute per contract + staff party swap

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

---

# Task History: Suffix GlideSelect on Signup & Padding Within Fix

## Objectives
1. **Suffix GlideSelect Padding Within Fix**:
   - Diagnosed root cause: `Signuppage.tsx` contained a global CSS reset `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }` in its `<style>` block. Because this rendered after Tailwind utilities, it stripped all padding (`padding: 0;`) from the GlideSelect `<button>` trigger and option elements, causing "None" and the dropdown options to sit flush against the border with 0px padding.
   - Removed `padding: 0;` from the universal selector in `Signuppage.tsx` (`*, *::before, *::after { box-sizing: border-box; margin: 0; }`).
   - Added explicit inline styles `style={{ paddingLeft: 14, paddingRight: 14 }}` on `<button ref={triggerRef}>`, `style={{ padding: 6 }}` on `menuRef`, and `style={{ paddingLeft: 10, paddingRight: 10 }}` on each option item in `GlideSelect.tsx`.
   - Added explicit CSS overrides in `Signuppage.tsx`: `.auth-glide-select button[role="combobox"] { padding-left: 14px !important; padding-right: 14px !important; }`, `.auth-glide-select [data-state="open"] { padding: 6px !important; }`, and `.auth-glide-select [role="option"] { padding-left: 10px !important; padding-right: 10px !important; }`.
2. **Suffix Dropdown & Form Spacing Refinements**:
   - Allowed custom `rowHeight` in `GlideSelect.tsx` and set `rowHeight={32}` for Suffix options (down from 40px).
   - Inherited `font-family: 'Plus Jakarta Sans'` across dropdown menu container, listbox, and option items.
   - Explicitly standardized `<input>` height at `44px` with `boxSizing: 'border-box'` and `padding: "11px 14px"` to match the 44px GlideSelect trigger height across the entire form.
3. **Chat Inbox Unread Count Reappearing on Refresh**:
   - Fixed MongoDB aggregation in `backend/repositories/InboxRepositories.js`: `getInboxByAccountId` was casting the `account_id` array to a string (`readerAccountId: String(account_id)`), turning multi-account IDs into `"id1,id2"`.
   - Used `readerAccountIds: accountIds` with array operations (`$not: [{ $in: ["$sender_id", "$$readerAccountIds"] }]` and `$setIntersection`) to accurately determine unread count.
   - Added explicit POST endpoint `/api/inbox/conversation/:conversationId/read` and wired it into `chat_state.ts`'s `markConversationRead` alongside WebSocket to ensure reliable database read synchronization.

## Acceptance Criteria
- [x] Suffix trigger button has 14px internal padding, matching the 14px padding of Middle name and other form fields.
- [x] Suffix dropdown options have balanced internal padding (10px + 6px container = 16px) with no flush edges.
- [x] Global reset `* { padding: 0; }` in `Signuppage.tsx` removed so it never wipes out element padding.
- [x] `npm --prefix frontend run build` passes with zero errors.
# Template toast wording (completed)

Objective: Identify templates explicitly in editor marketplace notifications.

- [x] Like/save/report toasts use template wording for templates.
- [x] Purchase/license and use toasts identify templates.
- [x] Preserve media asset behavior; no verification commands run.

