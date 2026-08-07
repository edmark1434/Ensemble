# Backend naming refactor report

## Renamed folders

- `Controllers/` -> `controllers/`
- `Services/` -> `services/`
- `Repositories/` -> `repositories/`
- `Route/` -> `routes/`
- Files from `scratch/` were consolidated into `scripts/`; `scratch/` was removed.
- Files from `sql/` were consolidated into `scripts/`; `sql/` was removed.

`lib/`, `middleware/`, `migrations/`, and `scripts/` were already lowercase. No duplicate case-variant directories remain.

## Renamed or moved files

### Repository

- `Repositories/FIleRepositories.js` -> `repositories/FileRepositories.js`

### Routes

- `Route/account.js` -> `routes/Account.js`
- `Route/admin.js` -> `routes/Admin.js`
- `Route/api.js` -> `routes/Api.js`
- `Route/contract.js` -> `routes/Contract.js`
- `Route/file.js` -> `routes/File.js`
- `Route/forum.js` -> `routes/Forum.js`
- `Route/inbox.js` -> `routes/Inbox.js`
- `Route/job.js` -> `routes/Job.js`
- `Route/moderator.js` -> `routes/Moderator.js`
- `Route/notification.js` -> `routes/Notification.js`
- `Route/payment.js` -> `routes/Payment.js`
- `Route/staff.js` -> `routes/Staff.js`
- `Route/subscription.js` -> `routes/Subscription.js`
- `Route/survey.js` -> `routes/Survey.js`
- `Route/Tag.js` -> `routes/Tag.js`
- `Route/teams.js` -> `routes/Teams.js`
- `Route/terms.js` -> `routes/Terms.js`
- `Route/ticket.js` -> `routes/Ticket.js`
- `Route/transaction.js` -> `routes/Transaction.js`
- `Route/user.js` -> `routes/User.js`
- `Route/verification.js` -> `routes/Verification.js`

### Middleware

- `checkSession.js` -> `CheckSession.js`
- `optionalAuth.js` -> `OptionalAuth.js`
- `optionalSession.js` -> `OptionalSession.js`
- `requireAdmin.js` -> `RequireAdmin.js`
- `requireAuth.js` -> `RequireAuth.js`
- `requireStaffRole.js` -> `RequireStaffRole.js`

### Library

- `amazon_s3.js` -> `AmazonS3.js`
- `background_job.js` -> `BackgroundJob.js`
- `clean.js` -> `Clean.js`
- `create-db.js` -> `CreateDb.js`
- `creditTransactionEnums.js` -> `CreditTransactionEnums.js`
- `database.js` -> `Database.js`
- `mongodb.js` -> `MongoDb.js`
- `redis.js` -> `Redis.js`
- `reportEnums.js` -> `ReportEnums.js`
- `seed.js` -> `Seed.js`
- `seed-domains.js` -> `SeedDomains.js`
- `setup-db.js` -> `SetupDb.js`
- `ticketEnums.js` -> `TicketEnums.js`
- `userTeamPermissions.js` -> `UserTeamPermissions.js`
- `websocket.js` -> `WebSocket.js`

### Root and scripts

- `server.js` -> `Server.js`
- `create_job_saves.js` -> `scripts/CreateJobSaves.js`
- `delete_jobs.js` -> `scripts/DeleteJobs.js`
- `migrate_terms.js` -> `scripts/MigrateTerms.js`
- `test_db.js` -> `scripts/TestDb.js`
- `scratch/export_seeds.js` -> `scripts/ExportSeeds.js`
- `scratch/test_is_saved.js` -> `scripts/TestIsSaved.js`
- `scratch/test_proposals.js` -> `scripts/TestProposals.js`
- `scripts/seed-jobs-if-empty.js` -> `scripts/SeedJobsIfEmpty.js`
- `sql/schemaold(archive).sql` -> `scripts/SchemaOldArchive.sql`

Migration filenames were intentionally preserved because node-pg-migrate uses them as immutable migration identifiers. Renaming applied migrations could cause them to run again.

## Files whose imports were modified

- Controllers: `AccountControllers.js`, `AccountVerificationControllers.js`, `AdminAnalyticsControllers.js`, `AdminControllers.js`, `AdminEconomyControllers.js`, `AdminModerationControllers.js`, `AdminSettingsControllers.js`, `AdminStaffControllers.js`, `AdminTicketsControllers.js`, `AdminUserTeamControllers.js`, `ContractControllers.js`, `FileControllers.js`, `ForumDiscussionControllers.js`, `ForumGroupControllers.js`, `ForumModeratorControllers.js`, `ForumReportControllers.js`, `InboxControllers.js`, `JobControllers.js`, `JobsModeratorControllers.js`, `MarketplaceModeratorControllers.js`, `NotificationControllers.js`, `ProfileControllers.js`, `SubscriptionControllers.js`, `SupportModeratorControllers.js`, `SurveyControllers.js`, `SystemControllers.js`, `TeamsControllers.js`, `TermsControllers.js`, `TicketControllers.js`, `TransactionControllers.js`, `UserControllers.js`.
- Services: `AccountServices.js`, `AccountVerificationServices.js`, `AdminVerificationServices.js`, `FileServices.js`, `ForumDiscussionServices.js`, `ForumGroupServices.js`, `ForumModeratorServices.js`, `ForumReportServices.js`, `InboxServices.js`, `JobServices.js`, `NotificationServices.js`, `PaymentServices.js`, `ProfileServices.js`, `SubscriptionServices.js`, `SurveyServices.js`, `SystemServices.js`, `TeamsServices.js`, `TermsServices.js`, `TicketServices.js`, `TransactionServices.js`, `UserServices.js`.
- Repositories: `AccountRepositories.js`, `AccountVerificationRepositories.js`, `AdminAnalyticsRepositories.js`, `AdminEconomyRepositories.js`, `AdminModerationRepositories.js`, `AdminRepositories.js`, `AdminSettingsRepositories.js`, `AdminTicketsRepositories.js`, `AdminUserTeamRepositories.js`, `ContractRepositories.js`, `DisputeChatRepositories.js`, `FileRepositories.js`, `ForumDiscussionRepositories.js`, `ForumGroupRepositories.js`, `ForumModeratorRepositories.js`, `InboxRepositories.js`, `JobRepositories.js`, `JobsModeratorRepositories.js`, `MarketplaceModeratorRepositories.js`, `ModeratorRepositories.js`, `ModeratorSharedRepositories.js`, `NotificationRepositories.js`, `PaymentRepositories.js`, `ProfileRepositories.js`, `StaffRepositories.js`, `SubscriptionRepositories.js`, `SupportModeratorRepositories.js`, `SurveyRepositories.js`, `TagRepositories.js`, `TeamsRepositories.js`, `TermsRepositories.js`, `TicketRepositories.js`, `TransactionRepositories.js`, `UserRepositories.js`.
- Routes: `Account.js`, `Admin.js`, `Api.js`, `Contract.js`, `File.js`, `Forum.js`, `Inbox.js`, `Job.js`, `Moderator.js`, `Notification.js`, `Payment.js`, `Staff.js`, `Subscription.js`, `Survey.js`, `Tag.js`, `Teams.js`, `Terms.js`, `Ticket.js`, `Transaction.js`, `User.js`, `Verification.js`.
- Library: `BackgroundJob.js`, `Clean.js`, `Seed.js`, `SeedDomains.js`, `SetupDb.js`, `WebSocket.js`.
- Middleware: `CheckSession.js`, `OptionalSession.js`, `RequireAuth.js`.
- Scripts/entrypoint: `CreateJobSaves.js`, `DeleteJobs.js`, `SeedJobsIfEmpty.js`, `TestIsSaved.js`, and `Server.js`.
- Package entry/script paths: `package.json`.

## Validation

- Exact-case local import resolver: 0 unresolved imports.
- Runtime syntax validation: 141 files checked, 0 failures.
- Complete API route graph load: passed.
- Static runtime dependency graph: 0 circular components.
- Root case-duplicate check: 0 duplicates.

## Unresolved imports and manual fixes

- Unresolved imports: none.
- Runtime manual fixes: none.
- Git on Windows may not display case-only directory renames until all changes are staged. The repository has `core.ignorecase=false`; stage the complete refactor together so Git records lowercase paths for Linux.
