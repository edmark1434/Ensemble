# Current Task — Handle Didit Test Webhook

Resolve 404 error returned when testing the Didit webhook URL (`/api/verification/webhook/status/updated`).

## Root Cause
- The webhook DID reach the Node.js backend through ngrok, successfully passed HMAC signature validation in `verifyDiditWebhook`, and reached `handleVerificationWebhookStatusUpdated`.
- When clicking "Test Webhook" in the Didit portal, Didit sends a dummy test event with `X-Didit-Test-Webhook: true`, `metadata: { test_webhook: true }`, and a fake `session_id: "42d22fa3-eed5-4b38-b4fb-fa6f63287657"`.
- `processDiditVerificationStatusUpdate` searches PostgreSQL for this dummy session ID, which does not exist, and returns `{ found: false }`.
- `handleVerificationWebhookStatusUpdated` then returns HTTP `404 {"success":false,"message":"Verification session not found"}`.
- To Didit and the user, this appears as an immediate 404 failure.

## Acceptance Criteria
- [x] Update `processDiditVerificationStatusUpdate` and `handleVerificationWebhookStatusUpdated` to detect Didit test events (`X-Didit-Test-Webhook` header or `metadata.test_webhook`) and respond with HTTP 200 OK.
- [x] Test the webhook endpoint locally and via ngrok with a simulated Didit test webhook to ensure it returns 200 OK.

Status: Completed

