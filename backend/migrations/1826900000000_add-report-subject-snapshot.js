/**
 * Store a copy of the reported item so staff can still see it after
 * the live post, listing, or message is gone.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('reports', {
    subject_snapshot: { type: 'jsonb' },
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropColumn('reports', 'subject_snapshot');
};
