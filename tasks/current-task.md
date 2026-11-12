# Active Task: Staff host must not trap member login

## Implementation Objective

On `staff.ensemble.software`, choosing the member/user login path must reach
the platform login on the main site. An existing staff session must not bounce
the browser back into the staff desk.

## Acceptance Criteria

- [x] “Member login” from the staff portal opens the main-site member login.
- [x] Visiting `/login` (and signup/forgot/reset) on the main site with a staff
      session does not auto-redirect to the staff desk.
- [x] Already-signed-in staff on the portal login see Continue vs Member login
      instead of a silent redirect.
- [x] Staff can still reach their desk from Continue / successful staff login.
- [x] Admin session handling on the member site remains unchanged.
