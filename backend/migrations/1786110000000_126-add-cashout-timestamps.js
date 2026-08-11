/**
 * Some deployed databases created cashouts before timestamp columns were added
 * to migration 072. Keep this as a separate forward migration because editing
 * an already-applied migration does not update an existing database.
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE cashouts
      ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE cashouts
      ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE cashouts DROP COLUMN IF EXISTS updated_at;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS created_at;
  `);
};
