# Current Task

## Objective

Perform a focused security hardening and bug-fix pass on the application based on vulnerabilities and bugs already discovered during the initial pentest, while also inspecting other crucial application areas for related vulnerabilities.

The primary goals are to:

* reduce exposed attack surface
* prevent unauthorized data exposure
* add IP-based rate limiting
* add CSRF protection where applicable
* prevent sensitive frontend environment leakage
* eliminate duplicate API requests
* inspect API responses for excessive or sensitive data exposure
* identify additional vulnerabilities in critical parts of the system
* fix only vulnerabilities and bugs directly related to this task
* avoid unrelated refactors or feature changes

Before making any code changes, produce an initial security assessment containing:

1. known vulnerability or bug
2. affected area
3. root cause
4. severity
5. exploitation or failure scenario
6. proposed solution
7. exact files expected to change
8. verification method

Do not modify code until the affected execution paths have been traced and the proposed changes are understood.

---

# Known Findings From Initial Pentest

The following issues have already been discovered and must be investigated.

## 1. `/api/recent-avatar` exposes account information to unauthenticated guests

Observed behavior:

```text
GET /api/recent-avatar
```

can return account/user information even when the requester has not authenticated.

This potentially allows guests to enumerate or discover users/accounts.

Investigate:

```text
route
→ middleware
→ controller
→ service
→ repository
→ database query
→ response serializer
```

Determine exactly which fields are exposed.

Potential risks include:

* user enumeration
* exposure of account IDs
* exposure of profile information
* exposure of avatars linked to identifiable users
* unnecessary disclosure of internal identifiers
* privacy leakage
* information gathering for later attacks

Do not assume authentication is always the correct solution.

Determine whether the endpoint should:

* require authentication
* return only explicitly public information
* return anonymized information
* be removed from guest-facing flows
* enforce a stricter response schema

Apply the smallest secure solution compatible with the existing product behavior.

---

## 2. Frontend `import.meta.env` exposure

Inspect the frontend for usage of:

```text
import.meta.env
```

Identify all environment variables referenced by frontend code.

Classify them into:

```text
PUBLIC
SAFE FOR CLIENT

or

SECRET
SERVER ONLY
```

Look specifically for possible exposure of:

* private API keys
* provider secrets
* database credentials
* Redis credentials
* JWT secrets
* signing secrets
* webhook secrets
* cloud provider secrets
* storage secrets
* payment-provider private credentials
* internal service credentials
* private backend configuration

Remember that any variable bundled into frontend JavaScript must be considered visible to the user.

Frontend environment variables must contain only configuration explicitly safe for public exposure.

If a secret is currently required by frontend code:

```text
frontend
→ secret provider request
```

must be redesigned into:

```text
frontend
→ application backend
→ external provider
```

Do not merely rename a secret environment variable and leave it bundled in the frontend.

---

## 3. Duplicate API requests on landing page

Investigate duplicate requests occurring when the landing page loads.

Trace:

```text
landing page
→ component
→ useEffect/hooks
→ query library/API client
→ API request
```

Determine whether duplicate requests originate from:

* React StrictMode
* duplicate `useEffect`
* incorrect dependencies
* repeated component mounting
* multiple components requesting identical data
* manual request + query-library request
* retry behavior
* route transitions
* state updates triggering another request
* missing caching/deduplication
* frontend race conditions

Fix the actual root cause.

Do not remove React StrictMode solely to hide duplicate-request behavior unless the project explicitly requires this and there is a strong technical justification.

The final behavior should avoid unnecessary duplicate API requests in production and should not create stale or inconsistent UI state.

---

## 4. Missing IP-based rate limiting

The application lacks sufficient rate limiting.

Add centralized IP-based rate limiting using the project's existing backend architecture.

Do not blindly apply one aggressive global limit to all endpoints.

Create appropriate limits based on endpoint sensitivity.

At minimum inspect:

```text
authentication
registration
password reset
email verification
OTP
KYC initiation
payment initiation
cashout/disbursement
file upload
search
public APIs
forms
messaging
resource creation
expensive endpoints
```

Sensitive endpoints should generally have stricter limits than normal API reads.

Rate limiting should consider:

* client IP
* trusted proxy configuration
* reverse proxy / deployment environment
* authenticated account ID where appropriate
* endpoint category
* rate-limit headers
* correct HTTP status
* Redis-backed/shared limiter if multiple backend instances are deployed

Do not trust arbitrary client-provided IP headers.

Use the application's trusted proxy configuration so the correct originating IP is resolved safely.

Expected rejection:

```text
HTTP 429 Too Many Requests
```

with a safe response body.

Do not expose internal infrastructure information in rate-limit responses.

---

## 5. CSRF protection for forms and state-changing requests

Inspect the application's authentication model before implementing CSRF protection.

Determine whether authentication uses:

* cookies
* session cookies
* JWT in HttpOnly cookies
* Authorization headers
* mixed authentication

CSRF protection must be applied where browser credentials are automatically included with requests.

Inspect state-changing methods:

```text
POST
PUT
PATCH
DELETE
```

especially those related to:

* profile updates
* account settings
* authentication
* password changes
* email changes
* wallet operations
* payments
* cashout
* subscriptions
* marketplace operations
* job creation
* proposals
* disputes
* messaging actions
* file operations
* KYC
* administrative actions

````

Use an established CSRF protection strategy compatible with the application's existing session/authentication design.

Possible valid strategies include:

- server-generated CSRF token
- synchronizer token pattern
- signed double-submit cookie
- framework-supported CSRF middleware

Do not create a custom cryptographic CSRF protocol unless existing architecture requires it.

Ensure:

```text
valid token
→ request accepted

missing token
→ rejected

invalid token
→ rejected

token from another session
→ rejected
````

Do not apply CSRF checks to endpoints where doing so would break legitimate provider webhooks or server-to-server APIs.

Webhook endpoints must instead retain appropriate signature verification.

---

# API Response Exposure Audit

Inspect API responses in security-sensitive and commonly accessed endpoints.

Look for excessive data exposure such as:

* password hashes
* authentication tokens
* refresh tokens
* internal account IDs where unnecessary
* email addresses
* phone numbers
* KYC documents
* verification metadata
* payment-provider IDs
* payment secrets
* session identifiers
* internal moderation fields
* role/permission internals
* private profile attributes
* private file URLs
* storage object keys
* stack traces
* raw database objects
* SQL/database errors
* environment data
* third-party provider responses
* internal infrastructure information

Prefer explicit response serialization / DTOs / allowlists over:

```javascript
res.json(databaseRow)
```

when database objects contain fields not intended for clients.

Responses should return only what the frontend actually requires.

Do not remove fields blindly.

Trace frontend usage before changing an API response contract.

---

# Additional Security Discovery

After investigating the known findings, perform a focused inspection of critical application areas.

This is not permission to rewrite the entire application.

Use progressive security discovery.

Prioritize attack surfaces that could result in:

* account takeover
* unauthorized access
* privilege escalation
* financial loss
* private data exposure
* arbitrary file access
* server compromise
* business-logic bypass
* payment manipulation

---

# Priority Security Areas

## 1. Authentication

Inspect:

* login
* registration
* logout
* session restoration
* password reset
* account verification
* JWT/session validation

Check for:

* account enumeration
* weak rate limiting
* authentication bypass
* insecure token handling
* insecure cookies
* overly long token lifetime
* missing revocation
* predictable reset tokens
* login brute force
* inconsistent logout
* stale sessions

---

## 2. Authorization

Check whether endpoints validate:

```text
Who is authenticated?
        +
Are they allowed to access THIS specific resource?
```

Look for:

* IDOR
* horizontal privilege escalation
* vertical privilege escalation
* trusting frontend role values
* missing ownership checks
* missing membership checks
* administrator-only actions accessible by normal users

Do not treat authentication alone as authorization.

---

## 3. Payments / Credits / Wallet / Cashout

Treat these as high-risk.

Inspect:

* credit balances
* top-ups
* transfers
* escrow
* refunds
* asset purchases
* fees
* cashout
* Xendit/provider callbacks
* transaction creation

Look for:

* client-controlled amount
* client-controlled balance
* duplicate transaction processing
* missing idempotency
* replay attacks
* unauthorized transfer
* negative values
* integer overflow/precision issues
* webhook spoofing
* missing signature validation
* race conditions
* double spending
* status manipulation

Never trust payment success based solely on frontend requests.

---

## 4. File Uploads

Inspect:

* file type validation
* file extension validation
* MIME validation
* file size
* filename handling
* storage keys
* download authorization
* signed URLs
* private files
* path traversal
* executable uploads

---

## 5. KYC / Verification

Inspect:

* session creation
* webhook handling
* verification status updates
* document access
* administrative access

Look for:

* spoofed verification status
* unauthorized document viewing
* webhook forgery
* client-controlled verified status
* sensitive identity data returned to normal users

---

## 6. Messaging / Socket.IO / Real-Time Features

Inspect:

* socket authentication
* room joining
* message authorization
* group membership
* notifications
* WebRTC signaling

Look for:

* joining arbitrary rooms
* receiving another user's notifications
* sending messages as another user
* trusting client account IDs
* unauthorized signaling
* missing membership verification

---

## 7. Marketplace / Jobs / Proposals / Disputes

Inspect ownership and role checks for:

* job creation
* job updates
* proposals
* accepting proposals
* hiring
* asset creation
* purchases
* refunds
* disputes
* ratings

Look for business-logic bypasses.

---

## 8. Administrative / Moderator APIs

Ensure admin and moderator actions enforce authorization server-side.

Never rely solely on hidden frontend buttons.

---

# Required Pre-Implementation Report

Before editing code, produce a report with this format:

```text
# Initial Security Assessment

## Finding 1

Name:
Severity:
Affected endpoint/page:
Affected execution path:

Current behavior:

Root cause:

Security impact:

Proposed fix:

Expected files to modify:

Verification:

---

## Finding 2
...
```

Include all known findings first:

```text
/api/recent-avatar exposure
frontend environment leakage
duplicate landing page request
missing rate limiting
missing/incomplete CSRF protection
```

Then add newly discovered vulnerabilities.

Severity should use:

```text
CRITICAL
HIGH
MEDIUM
LOW
INFORMATIONAL
```

Do not inflate severity.

---

# Change Scope Report

Before implementation, list the files expected to change.

Example:

```text
EXPECTED FILE CHANGES

backend/app.js
Reason:
Register rate limiting middleware.

backend/middleware/rateLimiter.js
Reason:
Centralized endpoint-specific rate limits.

backend/routes/UserRoutes.js
Reason:
Protect /api/recent-avatar.

frontend/src/pages/...
Reason:
Remove duplicate request root cause.
```

Do not modify files unrelated to an identified finding.

If additional files become necessary during implementation, explain why before modifying them in the final report.

---

# Implementation Rules

Use the smallest secure change possible.

Do not:

* rewrite unrelated modules
* change unrelated UI
* rename unrelated files
* reformat entire files unnecessarily
* perform speculative refactoring
* replace libraries without need
* modify unrelated database schemas
* disable existing security controls
* hardcode secrets
* move secrets into frontend code
* hide errors instead of fixing root causes
* suppress duplicate requests without understanding why they occur

Reuse:

* existing middleware patterns
* authentication context
* Redis infrastructure
* validation utilities
* logger
* repository pattern
* service pattern
* existing error-handling conventions

---

# Rate Limiting Requirements

Implement reusable rate-limit policies.

Conceptually:

```text
General API
→ moderate limit

Login
→ strict limit

Registration
→ strict limit

Password reset
→ very strict limit

OTP/email verification
→ very strict limit

Payments/cashout
→ strict transactional limit

Expensive search/API
→ appropriate resource-based limit
```

Exact limits should be based on existing system behavior.

Do not select values so strict that normal application usage breaks.

If Redis already exists and the deployment can run multiple backend instances, prefer a shared Redis-backed rate-limit store when supported by the current architecture.

If implementing an in-memory limiter, document the limitation for multi-instance deployments.

---

# CSRF Requirements

For state-changing authenticated browser requests:

```text
Browser
→ authenticated request
→ CSRF validation
→ route/controller
```

Ensure CSRF is integrated with existing frontend API calls.

Do not expose CSRF secrets.

If a CSRF token endpoint is needed, return only the token needed by the current authenticated browser session.

Provider webhooks must not be protected using browser CSRF validation.

They should instead use the provider's signature/authentication mechanism.

---

# Environment Variable Requirements

Generate an environment security inventory.

For each frontend-referenced variable:

```text
Variable:
Used by:
Public or secret:
Reason:
Action:
```

Anything bundled into frontend code must be assumed public.

Ensure `.env` files containing secrets are ignored from Git where appropriate.

Search version-controlled files for accidentally committed secrets related to this task.

Do not print actual secret values in the report.

Use:

```text
REDACTED
```

when reporting sensitive configuration.

If a credential appears genuinely exposed in repository history, report that rotation may be required.

Do not rotate credentials automatically unless explicitly authorized.

---

# Duplicate Request Requirements

For each duplicate request found:

```text
Endpoint:
Trigger:
Number of unintended requests:
Root cause:
Fix:
```

Confirm the change does not:

* break loading
* cause missing data
* introduce stale state
* create race conditions
* remove useful retry behavior

---

# Error Handling

API responses must not expose:

* stack traces
* SQL errors
* Redis errors
* filesystem paths
* provider credentials
* internal exception details
* environment values

Production errors should use safe responses.

Internal details may be logged using the project's existing logger, provided secrets are redacted.

---

# Logging Security

Inspect affected security-sensitive logging.

Do not log:

* passwords
* auth tokens
* refresh tokens
* session IDs
* OTP codes
* payment credentials
* webhook secrets
* private KYC information
* full sensitive request payloads

---

# Acceptance Criteria

## `/api/recent-avatar`

Unauthenticated callers cannot obtain private account information.

Response contains only explicitly allowed fields.

No unnecessary identifiers or sensitive account information are exposed.

---

## Rate Limiting

Sensitive endpoints reject excessive requests using:

```text
HTTP 429
```

Normal expected usage still works.

Client-controlled forwarded IP headers cannot trivially bypass the limiter.

---

## CSRF

Protected state-changing browser requests:

```text
valid CSRF
→ success

missing CSRF
→ rejected

invalid CSRF
→ rejected
```

Relevant frontend forms continue functioning.

Provider webhooks continue functioning.

---

## Frontend Environment

No server-only secret is bundled into frontend JavaScript.

Frontend configuration contains only explicitly public values.

---

## API Responses

Critical API responses contain only fields required by the client.

No sensitive internal or credential data is returned.

---

## Duplicate Requests

The known landing-page duplicate API request is resolved at its root cause.

Normal loading behavior remains correct.

---

## Authorization

Critical endpoints inspected during this task enforce both:

```text
authentication
+
resource authorization
```

where required.

---

## Build and Tests

Run existing supported commands discovered from the repository, such as:

```text
npm test
npm run test
npm run lint
npm run build
```

Use only commands actually defined in the relevant package configuration.

Do not report a test as passing if it was not executed.

---

# Security Verification

After implementation, test the relevant paths as both:

```text
unauthenticated guest
authenticated normal user
resource owner
different authenticated user
privileged user/admin where applicable
```

Test expected failures as well as expected successes.

Examples:

```text
Guest
→ /api/recent-avatar
→ private data must not leak
```

```text
Repeated login attempts
→ limiter eventually returns 429
```

```text
State-changing request without CSRF
→ rejected
```

```text
State-changing request with valid CSRF
→ succeeds
```

```text
User A resource ID supplied by User B
→ authorization denied
```

---

# Newly Discovered Vulnerabilities

During investigation, additional vulnerabilities may be found.

Record each one.

Use:

```text
Finding:
Severity:
Affected area:
Evidence:
Root cause:
Attack/failure scenario:
Recommended action:
In current scope: YES / NO
```

If:

```text
In current scope = YES
```

fix it when doing so is directly related and low-risk.

If:

```text
In current scope = NO
```

do not expand into a large unrelated refactor.

Document it for a future security task.

Critical vulnerabilities that could immediately compromise accounts, payments, secrets, or private user data should be clearly highlighted even if they require a separate follow-up task.

---

# Final Report

After implementation produce:

## Executive Summary

Summarize overall security improvements.

## Findings

For every known and newly discovered issue:

```text
Finding
Severity
Root cause
Resolution
Status
```

Status:

```text
FIXED
MITIGATED
OPEN
NOT APPLICABLE
```

## Files Changed

For every changed file:

```text
File:
Why it changed:
Finding addressed:
```

Confirm that unrelated files were not intentionally modified.

## Rate Limiting

Document:

* middleware
* storage mechanism
* endpoint categories
* rate policies
* proxy/IP behavior
* multi-instance limitations if any

## CSRF

Document:

* protection strategy
* protected routes
* frontend integration
* excluded webhook/server routes

## API Exposure

List APIs whose response payloads were reduced or protected.

Do not include sensitive values.

## Environment Security

Document:

* unsafe frontend environment usage found
* changes performed
* credentials requiring manual rotation, if any

Never print credential values.

## Duplicate Request Fixes

Document root causes and corrections.

## Additional Findings

List vulnerabilities discovered during the security inspection but not addressed because they were outside scope.

## Tests Performed

List exact commands and manual security scenarios actually executed.

## Remaining Risks

Document unresolved risks.

## Task Status

Set exactly one:

```text
COMPLETED
PARTIAL
BLOCKED
```

If `PARTIAL` or `BLOCKED`, explain why.

---

# Notes and Decisions

Security is part of implementation correctness.

Do not consider a feature complete if it functions but allows unauthorized access, exposes unnecessary data, trusts client-controlled identity, or weakens existing security controls.

Use progressive context discovery.

Start from the known vulnerable execution paths and expand only through direct dependencies.

Read only documentation relevant to:

* security
* authentication
* APIs
* sessions
* Redis
* frontend requests
* payments
* files
* KYC
* real-time communication

Do not reread all project documentation unnecessarily.

The application code is the final source of truth when documentation and implementation disagree.

Protect confidentiality, integrity, availability, and correct business behavior while preserving existing product functionality.
