# Current Task — Project Sharing & Invitation API Endpoint

Implement an authenticated sharing endpoint API that dispatches an email invitation with a 3-day expiration, creates an in-app notification redirecting to the editor, and sends a direct chat message with an embedded editor button.

## Acceptance Criteria
- [x] Backend: Create `InvitationRepositories.js` for project permission checks, project info queries, user/account lookups, and project membership mutations.
- [x] Backend: Implement `InvitationServices.js` with project sharing logic, Brevo email sending (matching forgot password layout with 3-day expiry), notification creation, direct message posting, and token acceptance/redirect.
- [x] Backend: Create `InvitationControllers.js` and `Invitation.js` routes, mounted in `Api.js` and `Project.js`.
- [x] Frontend: Update `notifications_page.tsx` to ensure notification taps redirect properly to the editor.
- [x] Frontend: Update `inbox_main.tsx` and `ChatWindow.tsx` to render rich project invitation embed cards with an "Open in Editor" button.
- [x] Verification: Test the sharing flow end-to-end (token validation, email payload, notification, inbox chat, member addition) and verify frontend builds cleanly.


