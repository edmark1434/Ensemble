# Current Task: Restrict Support Ticket Submission to Logged-in Users Only

## Objective
Disallow and do not display support ticket fields and forms to public (unauthenticated) users. Support ticket submission must be strictly accessible only to authenticated users who are logged in.

## Acceptance Criteria

1. **Frontend Disallowance & Form Suppression (`page_SubmitATicket.tsx`)**:
   - When no authenticated user session is detected (`!accountId`):
     - Hide/suppress all ticket form inputs and submission fields (problem category tabs, subgroup tabs, ticket type dropdown, custom questions/fields, issue subject, description textarea, screenshot file inputs, and submit button).
     - Display a prominent, styled "Sign In Required" card informing the user that filing a ticket requires an active account session.
     - Provide actionable navigation buttons: "Log In to Submit a Ticket" (redirecting to `/login?redirect=/support/ticket`) and "Create an Account" (`/signup`).
     - Keep self-service support links (FAQ, Chatbot, Feedback, Support us) visible and accessible so public visitors still have self-help channels.
   - When user is logged in (`accountId` exists):
     - Render the full ticket creation form.
     - All categories and ticket types from the catalog are selectable without logged-out restriction filtering.

2. **Backend Authentication Enforcement (`routes/User.js` & `AdminTicketsControllers.js`)**:
   - Protect `POST /api/users/tickets` with `requireAuth` middleware alongside `checkSession`.
   - In `createPublicTicket`, strictly verify that `req.session?.account_id || req.session?.accountId` exists.
   - Reject unauthenticated ticket submissions with HTTP 401 Unauthorized.
   - Remove logged-out ticket bypass logic (`LOGGED_OUT_TICKET_TYPES` resolution via username/email).

3. **Design & Code Standards**:
   - Follow existing dark/light visual theme and styling rules (no gradients).
   - Ensure clean build verification (`npm run build` in frontend).
