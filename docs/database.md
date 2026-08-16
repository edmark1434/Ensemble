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
