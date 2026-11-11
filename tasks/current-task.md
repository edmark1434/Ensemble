# Active Task: Remove redundant email field from Submit Ticket form & pass account email in payload

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
