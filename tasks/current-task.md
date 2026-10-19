# Current Task: Require login before the ticket page
# Current Task: Implement Dynamic Email Endpoint

## Objective
Guests opening the support ticket page should sign in before they see the app, including the main menu, marketplace, and other member navigation.
Implement a secure, reusable dynamic email endpoint `POST /api/notifications/send-email` that accepts dynamic recipient parameters, body content, and action links, while guaranteeing zero disruption to existing email workflows (verification OTP, password reset, project invitations, staff alerts).

## Acceptance criteria
- [x] An unsigned visitor to `/support/ticket` is sent to login and returned to the ticket form after signing in.
- [x] The member sidebar and header are not shown on that page until a session exists.
- [x] A signed-in member still opens the ticket form inside the app.
