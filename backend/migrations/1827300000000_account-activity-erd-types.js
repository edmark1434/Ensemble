/**
 * Align account_activity column types with the ER diagram:
 * string columns are unbounded varchar, created_at is timestamp (no time zone).
 * reference_id stays a string. Live rows store UUIDs and codes, so it cannot be int.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN action TYPE varchar USING action::varchar,
      ALTER COLUMN event_code TYPE varchar USING event_code::varchar,
      ALTER COLUMN reference_table TYPE varchar USING reference_table::varchar,
      ALTER COLUMN reference_prefix TYPE varchar USING reference_prefix::varchar,
      ALTER COLUMN reference_id TYPE varchar USING reference_id::varchar
  `);

  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN created_at DROP DEFAULT
  `);
  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN created_at TYPE timestamp without time zone
      USING created_at AT TIME ZONE 'UTC'
  `);
  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN created_at DROP DEFAULT
  `);
  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN created_at TYPE timestamptz
      USING created_at AT TIME ZONE 'UTC'
  `);
  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN created_at SET DEFAULT NOW()
  `);

  await pgm.db.query(`
    ALTER TABLE account_activity
      ALTER COLUMN action TYPE text USING action::text,
      ALTER COLUMN event_code TYPE varchar(80) USING event_code::varchar(80),
      ALTER COLUMN reference_table TYPE varchar(50) USING reference_table::varchar(50),
      ALTER COLUMN reference_prefix TYPE varchar(50) USING reference_prefix::varchar(50),
      ALTER COLUMN reference_id TYPE text USING reference_id::text
  `);
};
