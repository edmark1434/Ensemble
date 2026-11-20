/**
 * The missed-review window is now 24 hours instead of 7 days (docs/warning-system.md §4a).
 * Updates the seeded `missed_review` catalog note, only if staff have not edited it.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

const OLD_NOTE = 'Issued automatically when a member does not review the other party within 7 days of a contract ending. Staff can also issue it.';
const NEW_NOTE = 'Issued automatically when a member does not review the other party within 24 hours of a contract ending. Staff can also issue it.';

exports.up = async (pgm) => {
  await pgm.db.query(
    `UPDATE warning_defs SET note = $1 WHERE slug = 'missed_review' AND note = $2`,
    [NEW_NOTE, OLD_NOTE],
  );
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(
    `UPDATE warning_defs SET note = $1 WHERE slug = 'missed_review' AND note = $2`,
    [OLD_NOTE, NEW_NOTE],
  );
};
