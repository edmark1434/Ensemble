# Current Task: Require login before the ticket page

## Objective
Guests opening the support ticket page should sign in before they see the app, including the main menu, marketplace, and other member navigation.

## Acceptance criteria
- [x] An unsigned visitor to `/support/ticket` is sent to login and returned to the ticket form after signing in.
- [x] The member sidebar and header are not shown on that page until a session exists.
- [x] A signed-in member still opens the ticket form inside the app.
