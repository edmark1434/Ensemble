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

## Marketplace licenses

- `market_asset_licenses` replaces `user_market_assets`. Each row records one asset/bundle use: buyer, asset, paid price, purchase transaction, purchase date, status, and optional project/assignment date.
- Purchases create an unassigned license in the same transaction as wallet transfers. An existing active unassigned license is reused; after assignment, another purchase creates a separate license. Refunded/deleted purchases remain in history.
- At most one active unassigned license exists per buyer/asset, and at most one active license exists per project/asset. Database constraints and transaction locks enforce this. A project assignment and purchase identity cannot be changed afterward.
- Library purchase/download/review checks use the buyer's active licenses. A download/preview request with `projectId` instead checks an active license for that project plus current Owner/Manager/Editor membership. The license survives the buyer leaving the project.
- `credit_transactions` continues referencing `market_assets` for existing financial-history consumers; each new license links its exact purchase through `credit_transaction_id`. Legacy rows without a matching historical transaction keep that field null.
- Migration `1825200000000_market-asset-licenses` preserves old rows as unassigned licenses. Its down migration refuses to discard project assignments or multiple purchases that the old composite key cannot represent.
