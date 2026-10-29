# Database

## PostgreSQL conventions

- Connection utilities live in `backend/lib/Database.js`.
- SQL access belongs in `backend/repositories/`.
- Schema changes belong in `backend/migrations/` and use `node-pg-migrate`.
- Create migrations with `cd backend && npm run migration:create -- <name>`.
- Apply migrations with `cd backend && npm run migrate` against the intended environment.

## Migration rules

- Never modify an applied migration.
- Include reversible `down` behavior when safely possible.
- Add indexes for lookup, foreign-key, idempotency, status, and pagination fields when query patterns require them.
- Use database constraints for invariants: `NOT NULL`, foreign keys, unique keys, and valid status/value checks.
- Backfill existing rows before making a new column `NOT NULL`.
- Avoid destructive production changes without an explicit migration and rollout plan.

## IDs

- Internal primary/foreign keys remain implementation details.
- Accounts, projects, and media assets use their existing UUID primary keys; they do not have a separate `public_id` column.
- Do not introduce additional public identifier columns unless a future requirement explicitly defines their contract and lifecycle.

## Staff types

- `staff.role` is PostgreSQL enum `staff_role`: Admin, Support Moderator, Marketplace Moderator, Forum Moderator, Jobs N Gigs Moderator.
- ER diagram `string` columns are unbounded `varchar`: `password_hash`, `firebase_staff_uuid`, `first_name`, `last_name`, `email_address`.
- Labels match `backend/lib/StaffEnums.js`. Migration `1827400000000_staff-erd-types` converts the old varchar(50)/text columns. Do not edit the original `staff` create-table migration.

## Account activity types

- ER diagram `string` columns are unbounded `varchar`: `action`, `event_code`, `reference_table`, `reference_prefix`, `reference_id`.
- `created_at` is `timestamp without time zone`.
- `reference_id` is not an integer. Rows store UUIDs and codes (violations, tickets, wallets), so the column stays a string. Migration `1827300000000_account-activity-erd-types` aligns the rest. Do not edit the original `account_activity` create-table migration.

## Credit transaction enums

- `credit_transactions.type` is PostgreSQL enum `credit_transaction_type`: Fund Transfer, Escrow Hold, Escrow Release, Escrow Refund, Asset Purchase, Asset Refund, Fee, Cashout, Cashout Refund, Job Posting Fee, Job Posting Fee Refund, Proposal Fee, Proposal Fee Refund, Service Posting Fee.
- `credit_transactions.status` is PostgreSQL enum `credit_transaction_status`: Pending, Completed, Failed, Reversed. Default is Completed.
- Labels match `backend/lib/CreditTransactionEnums.js`. Migration `1827200000000_credit-transaction-native-enums` converts the old varchar columns and type CHECK constraint. Partial unique indexes on `type` are dropped and recreated with enum casts; Postgres cannot rewrite those predicates during `ALTER COLUMN TYPE`. Do not edit the original `credit_transactions` create-table migration.

## Transactions and money

- Wallet debits, cashout creation, status transitions, and credit-transaction history must remain consistent in one database transaction where practical.
- Lock or conditionally update balances to prevent concurrent overspending.
- Store external provider IDs and idempotency keys with uniqueness guarantees.
- Monetary amounts must use exact database types; never floating-point arithmetic.

## Query practices

- Parameterize every value.
- Select explicit columns for stable API contracts.
- Paginate growing histories with deterministic ordering and a tie-breaker.
- Treat schema errors as migration/version mismatches before adding query workarounds.

## Badge catalog

- Unlock rules live on `badges`: `trigger_event_code`, `condition_type` (`boolean` or `count`), and `condition_value`.
- `admin_grant` means honorary (staff grant only). Count badges use “at least” the stored number.
- `badge_categories` is the catalog grouping (`name`, `description`, soft-delete). `badges.badge_category_id` is required. Live category names are unique.
- `account_badges` is the grant table (pending / claimed / revoked). It is not the catalog.
- Migration `1826700000000_collapse-badges-to-single-table` copied category names onto `badges` and dropped `badge_categories`, `badge_requirements`, and `badge_requirement_defs`. `1827000000000_restore-badge-categories` puts the lookup table back and drops `badges.category`. Do not edit the original create-table migrations.

## Warning library

- `warning_defs` is the named warning catalog: slug, label, category, points (1–10), duration_days (1–365), desks, note, `is_system`, and `deleted_at`.
- Staff issue warnings by picking a live row. Points and `expires_at` on the issued `violations` row are copied at issue time; later catalog edits do not rewrite old cases.
- `warning_thresholds` maps stacked active points to an automatic effect (`none`, `record`, `limited`, `restricted`, `frozen`, `auto_suspend`). Highest matching `min_points` wins. Auto-suspend rows also store `suspend_days`.
- Migration `1826400000000_warning-defs` seeds the original hardcoded catalog. `1826600000000_warning-duration-and-thresholds` adds duration and seeds the default point ladder. Soft-delete hides a row from desks without touching issued warnings.

## Member reports

- `reports.subject_snapshot` is JSON: `{ kind, title, body, href, extra }`. It is written at submit time so staff can still read the reported job, gig, asset, discussion, group, team, profile, or inbox message if the live row is later deleted. Inbox messages have `href: null`.
- Migration `1826900000000_add-report-subject-snapshot` adds the column. Do not edit the original `reports` create-table migration.

## Dispute enums

- `disputes.type` is PostgreSQL enum `dispute_type`: Contract, Gig, Job, Marketplace, Feedback, Forum, Transaction, Team, General.
- `disputes.priority` is PostgreSQL enum `dispute_priority`: Low, Medium, High. Default is High.
- `disputes.status` is PostgreSQL enum `dispute_status`: pending_review, open, awaiting_response, under_review, closed.
- Labels match `backend/lib/DisputeEnums.js`. Migration `1827100000000_dispute-native-enums` converts the old varchar columns and CHECK constraints. Do not edit the original `disputes` create-table migration.

## Standing punishment library

- `punishment_defs` is the named ban / suspend / timeout catalog: slug, kind, label, category, duration_days (null = permanent), desks, note, `is_system`, and `deleted_at`.
- Staff issue standing by picking a live row. The default clock is copied unless they send a custom duration. Later catalog edits do not rewrite old sanctions.
- Migration `1826800000000_punishment-defs` seeds the platform catalog. Soft-delete hides a row from desks without lifting active bans, suspensions, or timeouts.

## Marketplace licenses

- `market_asset_licenses` replaces `user_market_assets`. Each row records one asset/bundle use: buyer, asset, paid price, purchase transaction, purchase date, status, and optional project/assignment date.
- Purchases create an unassigned license in the same transaction as wallet transfers. An existing active unassigned license is reused; after assignment, another purchase creates a separate license. Refunded/deleted purchases remain in history.
- At most one active unassigned license exists per buyer/asset, and at most one active license exists per project/asset. Database constraints and transaction locks enforce this. A project assignment and purchase identity cannot be changed afterward.
- Library purchase/download/review checks use the buyer's active licenses. A download/preview request with `projectId` instead checks an active license for that project plus current Owner/Manager/Editor membership. The license survives the buyer leaving the project.
- `credit_transactions` continues referencing `market_assets` for existing financial-history consumers; each new license links its exact purchase through `credit_transaction_id`. Legacy rows without a matching historical transaction keep that field null.
- Migration `1825200000000_market-asset-licenses` preserves old rows as unassigned licenses. Its down migration refuses to discard project assignments or multiple purchases that the old composite key cannot represent.

- Automatically using a currently free asset creates an assigned `market_asset_licenses` row with `price_credits = 0` and no `credit_transaction_id`; it does not consume an available unassigned library license. The saved project license survives listing price increases. No schema change is needed.
