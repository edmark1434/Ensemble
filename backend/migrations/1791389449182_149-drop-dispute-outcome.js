/** Drop disputes.outcome — closed state is status = closed only. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.dropIndex('disputes', 'outcome', { name: 'idx_disputes_outcome', ifExists: true });
  pgm.dropColumns('disputes', ['outcome'], { ifExists: true });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.addColumns('disputes', {
    outcome: { type: 'varchar(50)' },
  });
  pgm.createIndex('disputes', 'outcome', { name: 'idx_disputes_outcome' });
};
