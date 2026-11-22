/**
 * Extra time for a silent party on the continue-or-end question after a dispute.
 *
 * When `decide_by` passes and one party chose to continue while the other has not answered, the
 * question does not auto-continue straight away: the silent party gets one extension (a new
 * `decide_by`, a notice now and another reminder before the new deadline). `extended_at` records
 * that the one extension was used; when the extended deadline passes, the contract continues.
 * Logic: backend/repositories/ContractDisputeHoldRepositories.js (`autoContinueDecision`).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE contract_dispute_decisions
      ADD COLUMN IF NOT EXISTS extended_at timestamp without time zone NULL
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`ALTER TABLE contract_dispute_decisions DROP COLUMN IF EXISTS extended_at`);
};
