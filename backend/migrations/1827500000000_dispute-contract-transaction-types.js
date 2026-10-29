/**
 * Disputes are Contract or Transaction only.
 * Map leftover catalog types, then rebuild dispute_type.
 */

const NEXT_TYPES = ['Contract', 'Transaction'];
const LEGACY_TYPES = [
  'Contract',
  'Gig',
  'Job',
  'Marketplace',
  'Feedback',
  'Forum',
  'Transaction',
  'Team',
  'General',
];

function sqlEnumLabels(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN type TYPE varchar(50) USING type::text
  `);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_type`);

  await pgm.db.query(`
    UPDATE disputes
    SET type = CASE lower(btrim(COALESCE(type, '')))
      WHEN 'contract' THEN 'Contract'
      WHEN 'gig' THEN 'Contract'
      WHEN 'job' THEN 'Contract'
      WHEN 'jobs' THEN 'Contract'
      WHEN 'team' THEN 'Contract'
      WHEN 'transaction' THEN 'Transaction'
      WHEN 'payment' THEN 'Transaction'
      WHEN 'credit' THEN 'Transaction'
      WHEN 'marketplace' THEN 'Transaction'
      WHEN 'asset' THEN 'Transaction'
      WHEN 'listing' THEN 'Transaction'
      WHEN 'feedback' THEN 'Transaction'
      WHEN 'forum' THEN 'Transaction'
      WHEN 'forums' THEN 'Transaction'
      WHEN 'general' THEN 'Transaction'
      WHEN 'other' THEN 'Transaction'
      ELSE 'Contract'
    END
  `);

  await pgm.db.query(`CREATE TYPE dispute_type AS ENUM (${sqlEnumLabels(NEXT_TYPES)})`);
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN type TYPE dispute_type USING type::dispute_type
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN type TYPE varchar(50) USING type::text
  `);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_type`);
  await pgm.db.query(`CREATE TYPE dispute_type AS ENUM (${sqlEnumLabels(LEGACY_TYPES)})`);
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN type TYPE dispute_type USING type::dispute_type
  `);
};
