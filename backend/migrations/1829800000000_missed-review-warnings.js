/**
 * Missed contract reviews cost merit.
 *
 * When a contract ends (`Done`), each member party has REVIEW_WINDOW_DAYS to review the other
 * party. The system reminds them before the deadline and, if they still have not reviewed,
 * issues the `missed_review` warning (see docs/warning-system.md §4a).
 *
 *   - `violations.staff_id` becomes nullable: system-issued warnings have no staff author.
 *   - `warning_defs` gets the `missed_review` row (2 points, 5 days) unless one already exists.
 *   - `contract_review_obligations` records, per (contract, reviewer), when the reminder went
 *     out and which warning was issued, so each party is reminded and warned at most once.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.up = async (pgm) => {
  await pgm.db.query(`ALTER TABLE violations ALTER COLUMN staff_id DROP NOT NULL`);

  await pgm.db.query(`
    INSERT INTO warning_defs (slug, label, category, points, duration_days, desks, note, is_system, sort_order)
    SELECT
      'missed_review',
      'No review after a finished contract',
      'Jobs',
      2,
      5,
      '["admin","support","jobs"]'::jsonb,
      'Issued automatically when a member does not review the other party within 7 days of a contract ending. Staff can also issue it.',
      TRUE,
      COALESCE((SELECT MAX(sort_order) + 1 FROM warning_defs), 0)
    WHERE NOT EXISTS (
      SELECT 1 FROM warning_defs WHERE slug = 'missed_review' AND deleted_at IS NULL
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS contract_review_obligations (
      contract_id UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
      reviewer_account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      reminded_at TIMESTAMP WITHOUT TIME ZONE,
      warned_at TIMESTAMP WITHOUT TIME ZONE,
      violation_id UUID REFERENCES violations(violation_id) ON DELETE SET NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (contract_id, reviewer_account_id)
    )
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS contracts_done_ended_at_idx
      ON contracts (ended_at)
      WHERE LOWER(status) = 'done'
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS contracts_done_ended_at_idx`);
  await pgm.db.query(`DROP TABLE IF EXISTS contract_review_obligations`);
  await pgm.db.query(`
    DELETE FROM warning_defs
    WHERE slug = 'missed_review' AND is_system = TRUE
  `);
  // System warnings have no staff author; NOT NULL can only come back once none are left.
  await pgm.db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM violations WHERE staff_id IS NULL) THEN
        ALTER TABLE violations ALTER COLUMN staff_id SET NOT NULL;
      END IF;
    END $$;
  `);
};
