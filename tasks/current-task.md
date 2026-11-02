# Current task: Clean up the user-side dispute UI

## Objective

Make the member-facing dispute screens consistent with the rest of the app and easy to follow, without changing backend behavior.

## Scope

- `frontend/src/pages/user/disputes/disputeUi.tsx` (shared chips, pills, avatar, card, formatters)
- `frontend/src/pages/user/disputes/PublicDisputePage.tsx` (`/disputes/:id`)
- `frontend/src/pages/user/contracts/MyTransactionDisputesPage.tsx` (`/contracts/disputes`)
- `frontend/src/pages/user/7_profile/Displays/RatingsSection_ProfileDisplay.tsx` (public disputes modal)

## Acceptance criteria

- The public dispute page uses the standard user header and page background, with a back link, a header card (number, type, Public + status pills, title, both parties as profile links, original complaint), a discussion thread with avatars and role chips, and a sticky reply box.
- Role colours match the staff UI: disputer sky, disputee cyan, staff amber, public violet.
- The disputes page has a "Report a dispute" action, Active/Closed tabs, and cards showing role, Public/Private, status, a progress stepper, and the next step.
- The filer's private notes section clearly says only they and staff can see it, labels staff replies, and shows pending sends.
- Realtime, optimistic sending, and visibility rules are unchanged.
- Existing theme only; no gradients.
- `cd frontend && npm run build` passes.
