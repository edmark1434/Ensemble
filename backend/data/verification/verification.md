# Ensemble Account and Business Verification Guide

Primary navigation:

- [Personal verification status](/account-verification-status) — route: `/account-verification-status`
- [Account settings](/settings) — route: `/settings`
- [Your profile](/profile) — route: `/profile`
- [Teams](/teams) — route: `/teams`
- [Jobs marketplace](/jobs/postings) — route: `/jobs/postings`
- [Gigs marketplace](/gigs/services) — route: `/gigs/services`
- [Asset marketplace](/assets) — route: `/assets`
- [Submit a support ticket](/landing/SubmitATicket) — route: `/landing/SubmitATicket`

This guide explains signup email verification, personal identity verification, and Team business verification. They are separate checks and do not replace one another.

## Why Ensemble uses verification

Verification helps confirm that an account is controlled by a real person or that a Team represents the business it claims to represent. It reduces impersonation and fraud risk, creates a stronger trust signal for clients and freelancers, and supports safer marketplace activity.

Verification is not a guarantee that another user will complete a contract successfully. Users should still review profiles, proposals, contract terms, milestones, reviews, and platform notifications before making decisions.

## The three verification types

### Signup email verification

Signup email verification proves access to the email address used to create an account. A six-digit code is sent during registration. Completing email verification allows registration and onboarding to continue.

Email verification is not the same as personal identity verification. An account can have a verified email while its identity is still unverified.

If a user changes the email address in Account Settings, the new email must be verified before the change can be saved. Open [Account settings](/settings) at `/settings` to manage the email address.

### Personal identity verification

Personal identity verification is the Level 2 identity or KYC check for an individual account. It uses a supported government ID, identity-data extraction, a camera-based liveness check, face matching, provider risk checks, and review/status processing.

Open [Personal verification status](/account-verification-status) at `/account-verification-status` to start verification, resume an existing session, or view the current result and expiration date.

### Team business verification

Team business verification checks the registered identity and supporting documents of a Team or organization. It is submitted by the active Team owner and manually reviewed by an authorized Ensemble administrator.

Personal verification does not automatically verify a Team, and Team verification does not automatically verify every Team member. A Team receives its own Verified Business indicator after approval.

To begin, open [Teams](/teams) at `/teams`, select the Team, and choose **Verify as Business**. The Team-specific page uses a route shaped like `/teams/{team-id}/business-verification`.

## Personal identity verification requirements

Before starting, the user should have:

- A signed-in and activated Ensemble account.
- Access to the email address associated with the account.
- Accurate profile details, especially legal name, date of birth, and country.
- A valid supported government ID. The verification screen identifies Passport, Driver's License, and National ID as supported examples.
- A clear camera on a phone or computer for the liveness check.
- A stable internet connection and adequate lighting.

The name and birth date on the account should match the identity document. Use a clear, readable image with the full document visible. Do not use screenshots, photocopies, edited images, expired documents, or another person's ID.

## Personal verification process

1. Sign in and open [Personal verification status](/account-verification-status) at `/account-verification-status`.
2. Select **Start Verification**. Ensemble creates or reuses an eligible verification session and redirects the browser to the verification provider.
3. Submit the requested government ID images. The provider extracts document details and checks the document.
4. Complete the camera-based liveness and face-match steps. Follow the on-screen movement and lighting instructions.
5. Complete any additional requested checks and return to Ensemble.
6. Monitor `/account-verification-status` and platform notifications for the decision or a resubmission request.

Do not close the verification window while an upload or liveness step is processing. If the user leaves before completing the process, the existing eligible session may be resumed instead of creating a duplicate session.

## Personal verification statuses

- **Not started:** No active verification has been completed. Start from `/account-verification-status`.
- **Pending, In Progress, or Awaiting User:** The session exists but still needs user action or provider processing.
- **In Review:** Submitted information is being reviewed. The user should wait for a notification and avoid creating repeated submissions.
- **Approved:** The individual account is verified. The profile may display verified status, and verified-only marketplace actions become available subject to other rules.
- **Resubmitted or Reverification required:** One or more checks must be completed again. The request may specify ID document, liveness, face match, or IP analysis.
- **Declined:** The submitted evidence did not pass. The user receives a notification and must follow the resubmission instructions.
- **Rejected:** The current session is not approved. Open the status page for the available next action.
- **Expired or Abandoned:** The session was not completed within its usable period or was abandoned. Start or resume verification from the status page.

Provider approval normally creates an expiration date. The standard automated approval path defaults to one year unless an authorized administrator applies a different validity period. The exact **Valid until** date shown on `/account-verification-status` is authoritative for that account.

## Review time

The personal verification interface estimates approximately 1–3 business days when manual review is needed. Automated decisions may arrive sooner. This is an estimate, not a guaranteed deadline. Complex, unclear, inconsistent, or resubmitted documents may take longer.

Platform notifications are sent when verification is approved, declined, expired, abandoned, or requires completion. A background reconciliation process also checks eligible pending and in-review provider sessions if a provider webhook was missed while the server was unavailable.

## What happens without personal verification

An unverified user can still sign in, complete onboarding, maintain a profile, browse public marketplace content, view public forums, communicate through available platform features, and use account settings where those features do not separately require verification.

However, the backend blocks verified-only personal marketplace actions. Current verified-only actions include:

- Posting a job as an individual.
- Posting a gig or service as an individual.
- Submitting a job proposal as an individual.
- Posting assets in the Asset Marketplace.
- Submitting Team business verification as the Team owner.

Other requirements still apply after verification. For example, asset posting also depends on the active subscription's asset-post allowance; Team marketplace actions require an authorized Team role; and contracts, purchases, wallet operations, and uploads retain their own balance, ownership, file, and status rules.

Verification does not automatically add credits, upgrade a subscription, increase a plan limit, approve a proposal, guarantee a sale, or release escrow funds.

## Benefits of a verified personal account

- Access to personal verified-only job, gig, proposal, and asset-posting actions.
- A verified status indicator on the profile where the interface displays it.
- Eligibility for an active Team owner to submit Team business verification.
- A stronger identity trust signal for other marketplace participants.
- A recorded verification validity period and status notifications.

These benefits do not bypass subscription entitlements, Team roles, moderation restrictions, account status, wallet balance checks, or contract rules.

## Team business verification eligibility

Only the active **Owner** of the selected Team can submit business verification. The owner must first have an approved personal identity verification. Team Admins and ordinary members cannot submit the Team's business-verification application through this flow.

The Team account must exist and be accessible from [Teams](/teams) at `/teams`. Business verification is separate from creating a Team or joining a Team.

## Required Team business information

The application requires:

- Business type.
- Registered business name.
- Registration number.
- Registration country.
- The submitting owner's relationship to the business.
- At least one supporting document, including every document marked required for the selected business type.

Accepted relationships are Owner, Sole Proprietor, Director, Partner, President, Corporate Officer, Authorized Representative, Employee, and Other.

Authorized Representative, Employee, and Other require an additional authorization document.

## Team documents by business type

The required document is listed first. The remaining documents are optional supporting evidence unless the form marks them required.

- **Sole Proprietorship:** DTI Certificate required; BIR Certificate (Form 2303) and Mayor's or Business Permit optional.
- **One Person Corporation:** SEC Certificate required; GIS, Articles of Incorporation, BIR Certificate, and Business Permit optional.
- **Corporation:** SEC Certificate required; GIS, Articles of Incorporation, BIR Certificate, and Business Permit optional.
- **Partnership:** SEC Certificate required; Partnership Registration and BIR Certificate optional.
- **Cooperative:** CDA Certificate required; Certificate of Compliance optional.
- **Non-Profit Organization:** Non-Profit Registration Document required; SEC Certificate and BIR Certificate optional.
- **Educational Institution:** Government Recognition or Registration Document required.
- **Government Organization:** Government Authorization Document required.
- **Foreign Registered Business:** Foreign Business Registration Certificate required.
- **Other:** Business Registration Document required.

When authorization evidence is required, accepted choices include Authorization Letter, Secretary's Certificate, Board Resolution, Special Power of Attorney, Proof of Employment or Appointment, and Other Authorization Document.

## Team document upload rules

- Accepted formats are PDF, JPG/JPEG, PNG, and WebP.
- Each file must be non-empty and no larger than 5 MB.
- A maximum of 10 files can be submitted.
- Each document type can be submitted only once in the same application.
- The document type must match the selected business type or an allowed authorization-document type.
- All documents marked required must be included.

Business information and documents are manually reviewed. The Team verification interface estimates 3–5 business days. This is an estimate and may be longer if documents are unclear, inconsistent, incomplete, or need resubmission.

## Team verification outcomes and benefits

- **Pending or In Review:** The submission is waiting for an administrator decision.
- **Approved:** The Team is marked as a verified business and displays a **Verified Business** tag on Team cards and the selected Team page.
- **Declined:** The Team is not verified. Read the administrator's reason before submitting corrected information.
- **Reverification required:** The Team owner must correct or replace the requested business information or documents. Unlike personal identity reverification, a Team submission does not ask the owner to choose ID, liveness, face-match, or IP-analysis nodes.

Business verification provides a visible trust indicator for the Team. It does not verify every member, grant additional wallet credits, change member roles, override marketplace permissions, or guarantee contracts and payments.

## Fixing common verification problems

### The Start Verification button redirects but no session opens

Return to `/account-verification-status` while signed in and try once more. Disable popup or navigation blocking for the verification provider if necessary. Do not repeatedly click while **Creating Session** is displayed.

### Camera or liveness verification fails

Allow camera permission, use a supported browser, close other applications using the camera, improve lighting, keep the face fully visible, and retry the requested liveness step.

### The ID is rejected or data does not match

Confirm that the document is valid, readable, unedited, fully visible, and belongs to the account owner. Update incorrect account details through `/settings` only when appropriate, then follow the resubmission instructions. Do not alter accurate account information merely to force a match.

### Verification remains in review

Check notifications and `/account-verification-status`. Review estimates are not guarantees. Avoid duplicate submissions while a review is active. If the status remains unchanged well beyond the displayed estimate, submit a ticket at `/landing/SubmitATicket` and include the account email and a description of the issue. Never attach identity documents to an ordinary support message unless an authorized secure workflow specifically requests them.

### A Team cannot submit business verification

Confirm that the current user is the active Team owner and that the owner's personal identity is already verified. Team Admin and member roles are not sufficient for submission.

### A verified action is still unavailable

Check the exact expiration date, account status, onboarding status, subscription allowance, Team role, listing status, and wallet or contract requirements. Verification is only one eligibility condition.

## Privacy and safety guidance

- Submit identity and business documents only through the official verification pages.
- Do not send passwords, verification codes, full identity documents, provider tokens, or payment credentials through chat, forums, or ordinary support messages.
- Never share another person's identity document or complete verification on their behalf.
- Use [Submit a support ticket](/landing/SubmitATicket) at `/landing/SubmitATicket` for technical problems, but describe the issue without exposing sensitive document data.
- Ensemble Support can explain the process and check authorized status information, but it must not claim approval before the recorded verification status changes.

## Quick answers for support

**Is email verification enough?** No. Email verification activates and secures the account email. Personal identity verification is a separate Level 2 process.

**Can I browse Ensemble without identity verification?** Yes. Public browsing and general non-gated features remain available, but verified-only marketplace actions are restricted.

**Does a paid subscription bypass verification?** No. Subscription entitlements and verification are separate requirements.

**Does personal verification verify my Team?** No. The active Team owner must submit a separate business-verification application.

**Does Team verification verify all Team members?** No. It verifies the Team account and business evidence, not each member's personal identity.

**Can a Team Admin submit business verification?** No. The current backend flow permits only the active Team owner, who must also be personally verified.

**How will I know the result?** Check platform notifications and `/account-verification-status`; Team owners can also reopen the selected Team's business-verification page.

**Can support guarantee approval or a completion date?** No. Support can explain requirements and troubleshoot access, but approval and timing depend on the recorded provider or administrator review.