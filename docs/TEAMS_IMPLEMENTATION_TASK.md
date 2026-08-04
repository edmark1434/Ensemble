# Teams Module — Full-Stack CRUD and Membership Integration

## Objective

Implement a complete and dynamic Teams module for Ensemble.

The implementation must include:

* Backend repositories
* Backend services
* Backend controllers
* Backend routes
* Route registration
* PostgreSQL integration
* AWS S3 file upload integration
* Dynamic frontend integration
* Team membership management
* Team wallet display
* Reviews and reports
* Team chat integration

Do not redesign unrelated modules or modify unrelated files.

---

# Files and Locations

## Backend Migrations

Review these migrations first:

```text
E:\Ensemble\backend\migrations\1784589652236_082-create-teams.js
E:\Ensemble\backend\migrations\1784589682537_083-create-team-members.js
E:\Ensemble\backend\migrations\1784585838058_004-create-accounts.js
```

The `accounts` migration is the source of truth for account-related columns.

## Frontend

Only update the Teams page and its child files:

```text
E:\Ensemble\frontend\src\pages\user\3_teams
```

Shared reusable components may be updated only when required for Teams functionality and without breaking existing modules.

---

# Core Architecture

Follow the existing backend architecture and naming conventions:

```text
Route
→ Controller
→ Service
→ Repository
→ Database
```

Create or update the corresponding files for:

```text
TeamsRepositories.js
TeamsServices.js
TeamsControllers.js
teams.js
```

Register the Teams route in the main Express route configuration.

Do not put SQL queries inside controllers or services.

* Controllers handle HTTP requests and responses.
* Services handle business rules and authorization.
* Repositories handle database queries.
* Routes define endpoints and middleware.

---

# Account and Team Relationship

The application supports these account types:

```text
ACCOUNT type

- User
- Team
```

A Team must also have a corresponding record in the `accounts` table.

When creating a Team:

1. Create an `accounts` record.
2. Set the account type to `Team`.
3. Use the generated `account_id` as the Team account identity.
4. Create the corresponding record in the `teams` table.
5. Create the owner membership in `team_members`.
6. Complete all database operations in one transaction.

The authenticated user who creates the Team becomes the default Team owner.

The Team should have its own:

* `account_id`
* Account profile
* Avatar
* Wallet
* Team details
* Members
* Reviews
* Reports
* Inbox or group conversation

Do not use the creator’s personal `account_id` as the Team’s own `account_id`.

Store the creator separately as the Team owner through `team_members`.

---

# Team Avatar and S3 Upload

Use the project’s existing AWS S3 upload pattern.

The Team avatar must use the same file-management flow used by account avatars.

Expected flow:

1. Frontend selects an image.
2. Backend validates file type and size.
3. Backend creates or requests the S3 upload.
4. Save the uploaded file metadata through the existing file or system-file mechanism.
5. Save the resulting file identifier in:

```text
accounts.avatar_profile_id
```

Do not save raw base64 data in PostgreSQL.

Do not expose private S3 credentials or unrestricted upload permissions to the frontend.

If a Team avatar is updated:

* Replace the account’s `avatar_profile_id`.
* Preserve or safely delete the previous file according to the existing file lifecycle.
* Return the new avatar URL or resolved file information in the API response.

---

# Team Member Roles

Use only these Team Member roles:

```text
Owner
Admin
Manager
Member
```

## Owner

The owner is the authenticated user who created the Team.

Permissions:

* Full Team access
* Update Team details
* Delete Team
* Manage Team settings
* Approve or reject requests
* Invite members
* Remove members
* Suspend members
* Restore suspended members
* Change member roles
* Transfer Team ownership
* View Team wallet information
* Manage Team-related jobs, gigs, and projects

A Team must always have exactly one active owner.

The owner cannot:

* Leave the Team before transferring ownership
* Be removed by an Admin or Manager
* Be suspended by an Admin or Manager

## Admin

Permissions:

* Update Team settings
* Manage members except the Owner
* Approve or deny join requests
* Invite members
* Change Manager and Member roles
* Remove or suspend Managers and Members
* View and distribute Team funds when allowed by wallet rules
* Manage Team resources

Admin cannot:

* Delete the Team unless explicitly permitted by existing business rules
* Remove or demote the Owner
* Transfer ownership without Owner authorization

## Manager

Permissions:

* Manage Team jobs, gigs, and projects
* View members
* Perform project-related Team actions
* Access Team workspaces based on project permissions

Manager cannot:

* Delete the Team
* Manage Team ownership
* Change Admin or Owner roles
* Distribute funds unless explicitly authorized
* Remove Admins or the Owner

## Member

Permissions:

* View Team information
* Participate in Team projects
* Access Team chat
* Leave the Team
* Perform actions explicitly assigned to members

---

# Team Member Statuses

Use only these membership statuses:

```text
Active
Invited
Pending
Left
Suspended
Removed
```

## Status Meaning

### Active

The user is an active Team member and has access based on their role.

### Invited

The Team invited the user, but the user has not accepted or declined yet.

### Pending

The user requested to join the Team and is waiting for approval.

### Left

The user voluntarily left the Team.

The membership history remains stored.

### Suspended

The user remains connected to the Team but cannot access Team-restricted functionality.

### Removed

The member was removed by an authorized Team member.

The user is no longer an active member but may be invited or request to join again.

Do not permanently delete membership history unless the database design specifically requires it.

Prefer updating membership status over deleting membership records.

---

# Required Team Features

## 1. Create Team

The authenticated user can create a Team.

Required behavior:

* Validate required Team fields.
* Create a Team account with type `Team`.
* Create the Team record.
* Create the Team wallet if the existing wallet architecture requires it.
* Create an Owner membership for the authenticated user.
* Generate a unique Team join code.
* Upload and assign the Team avatar when provided.
* Return complete Team details.

Prevent duplicate Team handles, slugs, names, or join codes where uniqueness is required.

Use a database transaction.

---

## 2. Browse Teams

Users can browse discoverable Teams.

Support:

* Pagination
* Search by Team name
* Search by Team handle
* Filtering by category or status when fields exist
* Sorting
* Member count
* Team avatar
* Short Team description
* Current user membership status

Do not expose private or restricted Teams unless the user has access.

---

## 3. Read or View Team

Return Team details including:

* Team ID
* Team account ID
* Name
* Handle or slug
* Description
* Avatar
* Owner
* Member count
* Current user role
* Current user membership status
* Join code visibility based on permissions
* Team wallet summary based on permissions
* Reviews
* Average rating
* Report state if relevant
* Chat or inbox availability

---

## 4. Update Team Details

Owner and permitted Admins can update Team information.

Possible fields include those supported by the migrations and account structure, such as:

* Team name
* Display name
* Handle
* Bio or description
* Contact information
* Address or location
* Website
* Social links
* Avatar
* Visibility
* Join settings
* Team category

Use an allowlist of editable fields.

Do not accept arbitrary request-body fields.

Validate uniqueness before updating handles or slugs.

---

## 5. Delete Team

Only the Owner may delete a Team unless existing rules specify otherwise.

Before deletion:

* Verify ownership.
* Handle active jobs, gigs, escrow, disputes, or frozen funds.
* Prevent deletion if unresolved financial obligations exist.
* End or archive Team conversations.
* Preserve required audit history.
* Use soft deletion when supported.

Do not delete wallet or financial transaction history.

---

# Membership Features

## 6. Join Team Through Team Code

A user can join through a valid Team code.

Behavior depends on Team settings:

* Immediately create an `Active` membership, or
* Create a `Pending` membership for approval.

Validation:

* Code must exist.
* Code must be active.
* User must not already be an active member.
* Suspended users cannot bypass suspension using the code.
* Removed or Left users may rejoin according to Team settings.
* Owner cannot join their own Team again.

---

## 7. Request to Join Team

A user can request to join a discoverable Team.

Create or update membership status to:

```text
Pending
```

Prevent duplicate pending requests.

---

## 8. Invite Member

Owner or Admin can invite a user.

Create or update membership status to:

```text
Invited
```

The invite must include:

* Team
* Invited account
* Invited role
* Invited by
* Invitation date
* Optional expiration date

The user can accept or decline the invitation.

On acceptance:

```text
Invited → Active
```

On rejection:

```text
Invited → Removed
```

or use an existing declined-invite status if already defined in the database.

Do not create duplicate active memberships.

---

## 9. Approve or Deny Join Request

Owner or Admin can review pending requests.

Approve:

```text
Pending → Active
```

Deny:

```text
Pending → Removed
```

Record who performed the action and when if audit columns exist.

---

## 10. View Team Member Requests

Owner and Admin can view:

* Pending join requests
* Active invitations
* Suspended members
* Recently removed or left members

Support pagination and filtering.

---

## 11. Edit Member Role

Owner can change:

* Admin
* Manager
* Member

Admin may change:

* Manager
* Member

Admins cannot change the Owner role.

Prevent assigning multiple Owners through a normal role-update endpoint.

Ownership transfer must use a dedicated endpoint and transaction.

---

## 12. Transfer Ownership

Create a dedicated ownership-transfer operation.

Required steps:

1. Verify the requester is the current Owner.
2. Verify the target is an Active Team member.
3. Change the old Owner to `Admin`.
4. Change the target member to `Owner`.
5. Complete both updates in one transaction.
6. Guarantee that the Team always has exactly one Owner.

---

## 13. Remove or Kick Member

Owner or permitted Admin can remove members.

Set status to:

```text
Removed
```

Do not permanently delete the membership history.

The Owner cannot be removed.

An Admin cannot remove another Admin unless permitted by explicit rules.

---

## 14. Suspend Member

Owner or Admin can suspend eligible members.

Set status to:

```text
Suspended
```

Suspended members:

* Cannot access Team-only resources
* Cannot access Team chat
* Cannot act on behalf of the Team
* Cannot access Team jobs or projects
* Remain visible in administrative member history

Provide a restore action:

```text
Suspended → Active
```

---

## 15. Leave Team

An Active Team member can leave.

Set status to:

```text
Left
```

The Owner cannot leave until ownership is transferred.

Remove Team-specific permissions and chat access after leaving.

---

# Team Details Tabs

The Team detail interface must be dynamic and include these tabs:

```text
About
Members
Requests
Reviews
Wallet
Projects / Jobs / Gigs
Chat
```

Display tabs based on the authenticated user’s permissions.

## About Tab

Display:

* Team avatar
* Team name
* Handle
* Description
* Contact details
* Team category
* Creation date
* Owner
* Member count
* Join action
* Leave action
* Report action

## Members Tab

Display:

* Member avatar
* Display name
* Handle
* Role
* Status
* Joined date
* Role-management actions
* Suspend action
* Remove action

Actions must be hidden or disabled when the current user lacks permission.

## Requests Tab

Display:

* Pending join requests
* Invited members
* Approve button
* Deny button
* Cancel invitation button

Only Owner and Admin should access this tab.

## Reviews Tab

Display:

* Average rating
* Rating distribution
* Individual reviews
* Reviewer information
* Review date
* Review content
* Pagination

## Wallet Tab

Display the Team financial summary:

* Account wallet balance
* Available balance
* Escrow balance
* Frozen balance
* Recent Team transactions

Financial information must only be shown to authorized roles.

Do not calculate wallet balances solely on the frontend.

Use backend repository queries and existing wallet services.

---

# Team Wallet Integration

Use the Team’s own `account_id` to retrieve wallet data.

The response should distinguish:

```text
available_balance
escrow_balance
frozen_balance
total_balance
```

Use the project’s existing wallet and escrow tables as the source of truth.

Do not create duplicate wallet logic inside the Teams repository if reusable wallet services already exist.

Authorization recommendation:

* Owner: full wallet summary
* Admin: wallet summary and authorized distributions
* Manager: project-level financial summary only when allowed
* Member: no private wallet balance unless explicitly permitted

All balance-changing operations must use database transactions and existing financial ledger rules.

---

# Team Reviews

## Create Review

Users may review a Team only when they satisfy the platform’s review eligibility rules.

Recommended eligibility:

* The user completed a job, gig, transaction, or project involving the Team.
* The user has not already reviewed the same completed transaction.
* The user is not reviewing their own Team.
* The review is tied to a valid reference such as a job, gig, order, or contract.

Review fields may include:

* Team account ID
* Reviewer account ID
* Rating
* Comment
* Reference type
* Reference ID
* Created date

Validate the rating range.

Do not allow arbitrary duplicate reviews.

## Display Reviews

Return:

* Average rating
* Total review count
* Rating distribution
* Paginated review records

Resolve reviewer avatar and display name through the account relationship.

---

# Report Team

Users can report a Team.

The report must include:

* Reported Team account ID
* Reporter account ID
* Category
* Description
* Optional evidence files
* Created date
* Status

Possible report categories:

* Fraud
* Harassment
* Impersonation
* Scam
* Prohibited content
* Suspicious activity
* Other

Use existing reporting functionality when available instead of creating duplicate report tables or services.

Prevent spam and duplicate unresolved reports where appropriate.

---

# Team Chat and Inbox Integration

Provide a Team chat action from the Team details page.

When the user opens Team chat:

1. Check whether a Team group inbox already exists.
2. If it exists, redirect to the existing conversation.
3. If it does not exist, create one automatically.
4. Add all eligible Active Team members.
5. Redirect to the created conversation.

Use the existing inbox and chat architecture.

The Team conversation should contain:

* Team account reference
* Team name
* Team avatar
* Conversation type identifying it as a Team conversation
* Active Team members as participants

Do not create a duplicate inbox every time the user clicks Chat.

Use a unique database relationship or query such as:

```text
team_id + conversation_type
```

When membership changes:

* Active member: add to Team conversation
* Invited or Pending member: do not add
* Suspended member: revoke access
* Left member: remove access
* Removed member: remove access
* Restored member: add access again

Do not delete historical messages when a user leaves or is removed.

---

# Recommended Backend Endpoints

Use the project’s existing route naming conventions. A suggested structure is:

```text
POST   /api/teams
GET    /api/teams
GET    /api/teams/:teamId
PATCH  /api/teams/:teamId
DELETE /api/teams/:teamId

POST   /api/teams/:teamId/avatar
GET    /api/teams/:teamId/members
GET    /api/teams/:teamId/requests

POST   /api/teams/:teamId/join
POST   /api/teams/join-by-code
POST   /api/teams/:teamId/leave

POST   /api/teams/:teamId/invitations
PATCH  /api/teams/:teamId/invitations/:memberId/accept
PATCH  /api/teams/:teamId/invitations/:memberId/decline
DELETE /api/teams/:teamId/invitations/:memberId

PATCH  /api/teams/:teamId/requests/:memberId/approve
PATCH  /api/teams/:teamId/requests/:memberId/deny

PATCH  /api/teams/:teamId/members/:memberId/role
PATCH  /api/teams/:teamId/members/:memberId/suspend
PATCH  /api/teams/:teamId/members/:memberId/restore
DELETE /api/teams/:teamId/members/:memberId

PATCH  /api/teams/:teamId/transfer-ownership

GET    /api/teams/:teamId/wallet

GET    /api/teams/:teamId/reviews
POST   /api/teams/:teamId/reviews

POST   /api/teams/:teamId/reports

POST   /api/teams/:teamId/chat
```

Adjust route paths only to match existing backend conventions.

---

# Repository Requirements

Repositories must support:

* Insert Team account
* Insert Team record
* Update Team account
* Update Team record
* Fetch Team by Team ID
* Fetch Team by account ID
* Search and browse Teams
* Count Team members
* Fetch Team members
* Fetch membership by Team and account
* Insert membership
* Update membership role
* Update membership status
* Fetch pending requests
* Fetch invitations
* Validate Team owner
* Transfer ownership
* Retrieve Team wallet
* Retrieve reviews
* Create reviews
* Resolve Team conversation

Use parameterized SQL only.

Never concatenate untrusted values into SQL strings.

Use database transactions for:

* Team creation
* Team deletion or archival
* Ownership transfer
* Member acceptance when multiple records are affected
* Wallet-related operations
* Team account and Team profile updates that must remain synchronized

---

# Service Requirements

Services must enforce:

* Authentication
* Role-based authorization
* Membership-status validation
* Duplicate-membership prevention
* Ownership rules
* Team visibility
* Join-code validation
* Review eligibility
* Wallet-access permissions
* Chat membership synchronization
* Data validation
* S3 file validation

Create reusable permission helpers where appropriate, such as:

```text
requireTeamMember
requireActiveTeamMember
requireTeamManager
requireTeamAdmin
requireTeamOwner
canManageTargetMember
```

Do not rely only on frontend permission checks.

---

# Controller Requirements

Controllers must:

* Read validated route parameters and request bodies
* Get the authenticated user from the existing session or authentication middleware
* Call the correct service
* Return consistent status codes
* Return safe error messages
* Pass unexpected errors to the project’s error middleware

Suggested status codes:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

Do not return raw database errors, S3 credentials, stack traces, or internal SQL details.

---

# Frontend Requirements

Make all Teams pages dynamic using the backend APIs.

Remove mock data and hard-coded Team records.

Implement:

* Team browse page
* Search and filters
* Team creation modal or page
* Team update form
* Team avatar upload
* Team details page
* About tab
* Members tab
* Requests tab
* Reviews tab
* Wallet tab
* Chat redirection
* Join through Team code
* Join request
* Invite acceptance and rejection
* Member role editing
* Member suspension and restoration
* Member removal
* Ownership transfer
* Leave Team
* Delete Team
* Report Team
* Loading states
* Empty states
* Error states
* Confirmation dialogs
* Success and error toasts

Use the project’s existing:

* API client
* Authentication context
* Modal components
* Form components
* Toast system
* Avatar components
* Tabs
* Pagination components
* Confirmation dialogs

Do not introduce a new state-management library unless the project already uses it.

After every successful mutation, update the UI immediately or refetch the affected Team data.

---

# Frontend Permission Rules

Use the backend-provided current-user membership information.

Example response:

```json
{
  "current_user_membership": {
    "role": "Owner",
    "status": "Active",
    "permissions": {
      "can_update_team": true,
      "can_delete_team": true,
      "can_manage_members": true,
      "can_view_wallet": true,
      "can_manage_requests": true
    }
  }
}
```

Use backend-calculated permissions where possible.

The frontend may hide unauthorized actions, but the backend must still enforce authorization.

---

# Validation Requirements

Validate:

* Team name
* Team handle
* Description length
* Join code
* Team visibility
* UUID route parameters
* Account existence
* Membership existence
* Role values
* Status values
* Review rating
* Uploaded file type
* Uploaded file size
* Pagination limits

Use centralized constants or enums for:

```text
ACCOUNT_TYPES
TEAM_MEMBER_ROLES
TEAM_MEMBER_STATUSES
```

Do not scatter raw role and status strings throughout the code.

---

# Database Integrity

Ensure the database supports or validates:

* A Team account has account type `Team`.
* A Team has one associated Team account.
* A user cannot have duplicate active membership in the same Team.
* A Team has exactly one active Owner.
* Join codes are unique.
* Team ownership transfer is atomic.
* Membership records preserve history.
* Team deletion does not destroy financial records.
* Foreign keys use appropriate delete behavior.
* Frequently queried columns have indexes.

Recommended indexes:

```text
teams.account_id
teams.join_code
team_members.team_id
team_members.account_id
team_members.status
team_members.role
(team_id, account_id)
```

Use the actual column names from the migrations.

Do not create a new migration unless the existing schema cannot support a required feature.

If schema changes are required, create a new migration rather than editing migrations that may already have run.

---

# Security Requirements

* Use authenticated account information from the session or token.
* Never trust `account_id` sent by the frontend for ownership.
* Prevent privilege escalation through role updates.
* Prevent Admins from modifying the Owner.
* Prevent users from joining the same Team multiple times.
* Prevent unauthorized wallet access.
* Validate all UUIDs and request fields.
* Use parameterized SQL.
* Validate uploaded files.
* Do not expose private Team data.
* Do not expose S3 secrets.
* Add rate limiting to join, invite, review, and report actions when existing middleware supports it.
* Record important administrative actions when an audit system exists.

---

# Implementation Order

## Phase 1 — Audit

* Read the Team migrations.
* Read the accounts migration.
* Identify exact Team and member columns.
* Find existing account-creation logic.
* Find existing S3 avatar-upload logic.
* Find wallet and escrow services.
* Find reviews and reports modules.
* Find inbox creation and participant-management logic.
* Identify backend naming and response conventions.
* Identify frontend Teams components and existing mock data.

## Phase 2 — Backend Foundation

* Create constants and validation.
* Implement Team repositories.
* Implement Team services.
* Implement Team controllers.
* Implement Team routes.
* Register the routes.
* Add Team creation with account and owner membership transaction.
* Add read, browse, update, and delete operations.

## Phase 3 — Membership

* Implement join by code.
* Implement join request.
* Implement invitations.
* Implement accept and decline.
* Implement request approval and denial.
* Implement role updates.
* Implement suspend and restore.
* Implement member removal.
* Implement leave Team.
* Implement ownership transfer.

## Phase 4 — Integrations

* Integrate S3 Team avatar upload.
* Integrate Team wallet retrieval.
* Integrate escrow and frozen balances.
* Integrate Team reviews.
* Integrate Team reports.
* Integrate Team inbox creation and chat redirection.

## Phase 5 — Frontend

* Replace mock data.
* Connect browse and Team details pages.
* Connect Team creation and editing.
* Connect all membership actions.
* Connect requests and invitations.
* Connect reviews and reports.
* Connect wallet information.
* Connect Team chat redirection.
* Add loading, errors, empty states, and confirmation dialogs.

## Phase 6 — Verification

Test:

* User creates a Team.
* Team account is created correctly.
* Creator becomes Owner.
* Team avatar uploads successfully.
* User browses Teams.
* User joins using code.
* User requests to join.
* Admin approves or denies a request.
* User accepts or declines an invitation.
* Owner changes member roles.
* Unauthorized role changes are blocked.
* Owner suspends and restores members.
* Owner removes a member.
* Member leaves.
* Owner cannot leave before ownership transfer.
* Ownership transfer keeps exactly one Owner.
* Team wallet balances display correctly.
* Reviews require eligibility.
* Reports are submitted.
* Team chat is created only once.
* Active members are synchronized with Team chat.
* Removed or suspended members lose Team access.
* Team deletion is blocked by unresolved financial obligations.
* All endpoints return correct authorization errors.

---

# Completion Requirements

The task is complete only when:

* All Team data comes from the backend.
* No Teams-page mock data remains.
* All CRUD operations work.
* Membership statuses and roles are enforced.
* Team creation creates a Team account.
* The creator becomes Owner automatically.
* Team avatars use existing S3 integration.
* Team wallet and escrow balances are dynamic.
* Reviews and reports work.
* Chat opens an existing Team inbox or creates one once.
* Routes are registered.
* Backend authorization is enforced.
* Loading and error states exist.
* Existing account, wallet, inbox, and file functionality remains working.
* No unrelated modules are rewritten.

---

# Final Output Required From the Coding Agent

After implementation, provide:

1. Files created.
2. Files modified.
3. Routes added.
4. Database changes made.
5. Reused services and modules.
6. Permission rules implemented.
7. Remaining limitations or blocked features.
8. Manual testing instructions.
9. Any migration command required.
10. Any environment variables required.

Do not only explain the implementation. Apply the changes directly to the codebase.
