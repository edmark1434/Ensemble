/**
 * One appeal per penalty.
 *
 * An "Appeal an account penalty" ticket now names the single penalty it is about, so a member
 * with a suspension, a forum timeout and two warnings can appeal each one separately, and staff
 * accept or deny each on its own.
 *
 * - `tickets.appeal_target_type`: ban | lock | suspension | forum_timeout | warning | credit_hold |
 *   merit_penalty.
 * - `tickets.appeal_target_id`: which one. Warnings are `violations.violation_id`, timeouts
 *   `restrictions.restriction_id`, bans / locks / suspensions the `account_activity` row that moved
 *   the account into that status, credit holds `<wallet_id>@<frozen_at>`, automatic merit
 *   punishments `merit_penalties.merit_penalty_id`.
 * - `tickets.appeal_target_label` / `appeal_target_started_at`: what the member saw when they
 *   filed, so the ticket still reads correctly after the penalty ends.
 * - `tickets.appeal_outcome` (JSON): what the decision did — how an accepted penalty was lifted
 *   (`lift_24h`, `lift_now`, `shorten` with the new end, `rescind`), whether it was still
 *   active, and any follow-up action staff took on a denial (suspend or ban).
 * - `tickets.appeal_decision_note`: the reason staff gave the member for the decision.
 * - At most one undecided appeal per penalty (partial unique index).
 *
 * A denial now holds only that penalty and is read from the decided ticket.
 * `account_appeal_holds` keeps the account-wide holds decided before this change; they still
 * cover the penalties that already existed when they were decided. Older appeal tickets keep
 * NULL targets and their account-wide decision.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

const TARGET_TYPES = ['ban', 'lock', 'suspension', 'forum_timeout', 'warning', 'credit_hold', 'merit_penalty'];

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS appeal_target_type VARCHAR(24),
      ADD COLUMN IF NOT EXISTS appeal_target_id TEXT,
      ADD COLUMN IF NOT EXISTS appeal_target_label TEXT,
      ADD COLUMN IF NOT EXISTS appeal_target_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS appeal_outcome JSONB,
      ADD COLUMN IF NOT EXISTS appeal_decision_note TEXT
  `);
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_appeal_target_type_check`);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_appeal_target_type_check CHECK (
      appeal_target_type IS NULL
      OR appeal_target_type IN (${TARGET_TYPES.map((type) => `'${type}'`).join(', ')})
    )
  `);
  // A target is a type and an id together.
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_appeal_target_pair`);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_appeal_target_pair CHECK (
      (appeal_target_type IS NULL) = (appeal_target_id IS NULL)
    )
  `);
  // Undecided appeals cannot be closed without a decision, so "undecided" is the open state.
  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_open_penalty_appeal
      ON tickets (account_id, appeal_target_type, appeal_target_id)
      WHERE appeal_target_type IS NOT NULL AND appeal_decision IS NULL AND deleted_at IS NULL
  `);
  // Earlier decisions on one penalty (denial holds, accepted, history on the case file).
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_tickets_penalty_appeal_history
      ON tickets (account_id, appeal_target_type, appeal_target_id, appeal_decided_at DESC)
      WHERE appeal_target_type IS NOT NULL AND deleted_at IS NULL
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  // Targeted appeals become account-wide appeals again; their decisions stay on the tickets.
  await pgm.db.query(`DROP INDEX IF EXISTS idx_tickets_penalty_appeal_history`);
  await pgm.db.query(`DROP INDEX IF EXISTS uq_tickets_open_penalty_appeal`);
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_appeal_target_pair`);
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_appeal_target_type_check`);
  await pgm.db.query(`
    ALTER TABLE tickets
      DROP COLUMN IF EXISTS appeal_decision_note,
      DROP COLUMN IF EXISTS appeal_outcome,
      DROP COLUMN IF EXISTS appeal_target_started_at,
      DROP COLUMN IF EXISTS appeal_target_label,
      DROP COLUMN IF EXISTS appeal_target_id,
      DROP COLUMN IF EXISTS appeal_target_type
  `);
};
