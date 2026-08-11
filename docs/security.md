# Security

## Secrets and configuration

- Keep provider credentials, OAuth client secrets, encryption keys, JWT secrets, webhook verification tokens, and database URLs in environment/secret management.
- Commit example variable names only, never real values.
- Frontend variables are public to the browser; secrets must remain backend-only.
- Do not log access tokens, authorization codes, cookies, passwords, full payment details, or webhook tokens.

## Authentication and authorization

- Authentication alone is not authorization. Verify ownership, membership, role, and resource access in backend middleware/services.
- Use secure, HTTP-only cookies where established and keep CORS origins explicit with credentials enabled only for trusted origins.
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
