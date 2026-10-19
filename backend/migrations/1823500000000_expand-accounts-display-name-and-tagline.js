/**
 * Expand display_name and tagline on accounts table to support longer project and team titles.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE accounts
    ALTER COLUMN display_name TYPE VARCHAR(255),
    ALTER COLUMN tagline TYPE VARCHAR(255);
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE accounts
    ALTER COLUMN display_name TYPE VARCHAR(50),
    ALTER COLUMN tagline TYPE VARCHAR(50);
  `);
};
