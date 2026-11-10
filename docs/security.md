# Security

## Secrets and configuration

- Keep provider credentials, OAuth client secrets, encryption keys, JWT secrets, webhook verification tokens, and database URLs in environment/secret management.
- Commit example variable names only, never real values.
- Frontend variables are public to the browser; secrets must remain backend-only.
- Do not log access tokens, authorization codes, cookies, passwords, full payment details, or webhook tokens.

## Authentication and authorization

- Authentication alone is not authorization. Verify ownership, membership, role, and resource access in backend middleware/services.
- Use secure, HTTP-only cookies where established and keep CORS origins explicit with credentials enabled only for trusted origins. Admin and staff console origins are added from `FRONTEND_URL` (`admin.` / `staff.` on `ensemble.software`, and `admin.localhost` / `staff.localhost` in development). Do not replace that list with a wildcard.
- Clear auth cookies with the same `httpOnly`, `secure`, and `sameSite` options used to set them. Otherwise browsers keep the old cookie (`clearAuthCookies` in `UserControllers.js`, `clearAuthSession` in `lib/AccountRestriction.js`).
- Use `req.ip` for client IPs, never the raw `X-Forwarded-For` header. Production runs Cloudflare → VPS nginx → WireGuard → homelab Nginx Proxy Manager → API. The deployed `TRUST_PROXY` already resolves real visitor IPs and ignores client-supplied `X-Forwarded-For`; re-verify (for example, via the `rate-limit:v1:*` Redis keys) whenever a proxy hop changes. The VPS should only accept ports 80/443 from Cloudflare.
- Serve `admin.ensemble.software` and `staff.ensemble.software` with `Content-Security-Policy: frame-ancestors 'self'` (or `X-Frame-Options: SAMEORIGIN`). The app also refuses to render when framed cross-origin, but the header is the real clickjacking defense. Do not send `X-Frame-Options: DENY`; platform view frames its own host.
- OAuth `state` must be unpredictable, signed/verified, short-lived, and bound to the initiating user/session.
- OAuth redirect URIs must exactly match provider configuration.

## Input validation

- Validate all external input at the backend boundary, including path/query parameters, JSON bodies, uploaded file metadata, and provider callbacks.
- Signup passwords require at least eight characters, one uppercase letter, one lowercase letter, and one special character. Frontend checks are usability only; backend enforcement is authoritative.
- Return safe validation messages without stack traces or implementation details.

## Webhooks and idempotency

- Verify the configured provider callback token/signature before processing.
- Acknowledge valid duplicate deliveries safely.
- Store provider event/reference IDs or enforce conditional status transitions to make processing idempotent.
- Update state and create notifications within a consistent transaction, then emit realtime events.
- Use reconciliation jobs as recovery, not as a replacement for webhook authentication.

## Payments and cashouts

- Revalidate the wallet balance server-side at submission time.
- Never trust client-calculated totals, fees, recipient identity, or status.
- Minimize stored personal/payment data and mask it in responses and logs.
