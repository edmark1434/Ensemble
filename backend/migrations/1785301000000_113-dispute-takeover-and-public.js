/**
 * Dispute takeover requests + public visibility after approval.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('disputes', {
    takeover_requested_by_staff_id: { type: 'uuid' },
    takeover_requested_at: { type: 'timestamptz' },
    takeover_request_note: { type: 'text' },
  });

  pgm.addConstraint(
    'disputes',
    'disputes_takeover_requested_by_staff_id_fkey',
    'FOREIGN KEY (takeover_requested_by_staff_id) REFERENCES staff(staff_id)'
  );

  // Approval now means platform-visible to all logged-in users (comments still gated).
  pgm.sql(`
    UPDATE disputes
    SET visibility = 'public'
    WHERE LOWER(COALESCE(visibility, '')) IN ('parties', 'public')
       OR (
         LOWER(COALESCE(status, '')) NOT IN ('pending_review')
         AND approved_at IS NOT NULL
       )
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    UPDATE disputes
    SET visibility = 'parties'
    WHERE LOWER(COALESCE(visibility, '')) = 'public'
  `);
  pgm.dropConstraint('disputes', 'disputes_takeover_requested_by_staff_id_fkey', { ifExists: true });
  pgm.dropColumns(
    'disputes',
    ['takeover_requested_by_staff_id', 'takeover_requested_at', 'takeover_request_note'],
    { ifExists: true }
  );
};
