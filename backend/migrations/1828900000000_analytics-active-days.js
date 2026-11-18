/**
 * Real member activity for Admin → Analytics.
 *
 * Analytics used to show DAU / WAU / MAU and "retention" as fixed percentages of the
 * member count. Nothing recorded when members were actually active. `account_active_days`
 * stores one row per member account per day it made an authenticated request
 * (`services/ActiveDayServices.js`, called from `checkSession`). Distinct counts over it
 * give daily, weekly and monthly actives and signup-cohort retention from the day this
 * migration runs onward. Days follow the database time zone (`CURRENT_DATE`).
 *
 * Also indexes the date-range scans the analytics overview makes on payments, cashouts,
 * subscription invoices and member signups.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS account_active_days (
      account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      active_on DATE NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, active_on)
    );
    CREATE INDEX IF NOT EXISTS idx_account_active_days_day
      ON account_active_days (active_on, account_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_type_created
      ON accounts (type, created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_type_created
      ON payments (payment_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cashouts_created
      ON cashouts (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscription_invoices_paid
      ON subscription_invoices (paid_at)
      WHERE paid_at IS NOT NULL;
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_subscription_invoices_paid;
    DROP INDEX IF EXISTS idx_cashouts_created;
    DROP INDEX IF EXISTS idx_payments_type_created;
    DROP INDEX IF EXISTS idx_accounts_type_created;
    DROP TABLE IF EXISTS account_active_days;
  `);
};
