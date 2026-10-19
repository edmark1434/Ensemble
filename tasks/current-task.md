# Current Task: Implement Dynamic Email Endpoint

## Objective
Implement a secure, reusable dynamic email endpoint `POST /api/notifications/send-email` that accepts dynamic recipient parameters, body content, and action links, while guaranteeing zero disruption to existing email workflows (verification OTP, password reset, project invitations, staff alerts).

## Acceptance Criteria
1. **Dynamic Email Service (`backend/services/EmailServices.js`)**:
   - Provide `sendDynamicEmailService({ recipient, subject, content, links })`.
   - Generate responsive, clean HTML email with dynamic body paragraphs and action buttons.
   - Validate email format, subject, and content.
   - Sanitize links (enforcing `http://` / `https://`).
   - Support Brevo SMTP API (`https://api.brevo.com/v3/smtp/email`) with simulation fallback if `BREVO_API_KEY` is unset.
2. **Notification Controller (`backend/controllers/NotificationControllers.js`)**:
   - Add `sendDynamicEmailController` to handle request validation and response formatting.
   - Leave all existing notification controllers untouched.
3. **Notification Routes (`backend/routes/Notification.js`)**:
   - Mount `POST /send-email` protected by `[checkSession, requireAuth]`.
   - Leave all existing routes (`GET /`, `PATCH /read-all`, `PATCH /:notificationId/read`) untouched.
4. **Non-Disruption Guarantee**:
   - Verify that `backend/services/UserServices.js`, `backend/services/InvitationServices.js`, and `backend/services/PlatformAlertServices.js` are completely untouched.
5. **Verification**:
   - Syntax and execution test using node to verify that all backend files load and function without error.
