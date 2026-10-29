/**
 * Merit is removed. Conduct limits follow active warning points.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropColumn('accounts', 'merit_score', { ifExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.addColumn('accounts', {
    merit_score: { type: 'integer', notNull: true, default: 0 },
  }, { ifNotExists: true });
};
