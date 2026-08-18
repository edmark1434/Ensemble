/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Add the category column
  pgm.addColumn('gigs', {
    category: {
      type: 'VARCHAR(255)',
      notNull: false,
    },
  });

  // Backfill existing rows
  pgm.sql(`UPDATE gigs SET category = 'General' WHERE category IS NULL`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumn('gigs', 'category');
};
