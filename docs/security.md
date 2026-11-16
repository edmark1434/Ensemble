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
- Use `req.ip` for client IPs, never the raw `X-Forwarded-For` header. Production runs Cloudflare → VPS nginx → WireGuard → homelab Nginx Proxy Manager → API. The deployed `TRUST_PROXY` already resolves real visitor IPs and ignores client-supplied `X-Forwarded-For`; re-verify with Analytics → Traffic & rate limits ("IP pass-through check" compares `req.ip` with Cloudflare's `CF-Connecting-IP`) whenever a proxy hop changes. `TRUST_PROXY` accepts a hop count (`4`) or an Express address list (`loopback, 10.0.0.0/8`). Never use `true`, because it would trust a client-supplied `X-Forwarded-For`. The VPS should only accept ports 80/443 from Cloudflare.

## Rate limiting

- `middleware/RateLimiter.js` guards every `/api` request with Redis counters (`rate-limit:v2:<policy>:acct:<accountId>` or `…:ip:<ip>`). Requests with a session that exists in Redis count per account. Signed-out requests, and the `authentication` policy (login/signup) always, count per IP. Never key signed-in traffic by IP alone: many members share one public IP (campus/office Wi-Fi, carrier NAT), and per-IP buckets made one busy network return 429 to all of them.
- Everyday reads (`general`) and writes (`mutation`) use one-minute windows, so a block clears within a minute. Client polling counts against the account's budget: the team project workspace alone sends 7 GETs every 8 seconds.
- Route-level limits use `createRateLimiter(name, { windowMs, accountLimit, ipLimit, ipOnly?, message })` on the same store and monitor (AI chat `chat`, ticket creation `ticketCreate`). Do not add `express-rate-limit` instances; their in-memory, IP-keyed store is invisible to the monitor.
- The limiter fails open on Redis errors. The monitor counts those errors.
- Serve `admin.ensemble.software` and `staff.ensemble.software` with `Content-Security-Policy: frame-ancestors 'self'` (or `X-Frame-Options: SAMEORIGIN`). The app also refuses to render when framed cross-origin, but the header is the real clickjacking defense. Do not send `X-Frame-Options: DENY`; platform view frames its own host.
- Specialist moderator desks (marketplace, forum, jobs) may only reach tickets in their own queue, by id as well as by list. `lib/TicketQueueScope.js` (`ticketInStaffQueue`) mirrors each desk's list query; the shared `/api/staff/tickets/:id/*` routes use `requireTicketInStaffQueue`, and marketplace ticket message edit/delete routes use `requireMarketplaceTicket`. Staff-created tickets from a specialist desk must use that desk's ticket types.
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
