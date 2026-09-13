/**
 * Slim reports: drop resolved_at, target_label, reason.
 * Category lives in type; details in description; updated_at tracks status changes.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  // Prefer free-text reason as the report category (type).
  await pgm.db.query(`
    UPDATE reports
    SET type = COALESCE(NULLIF(TRIM(reason), ''), NULLIF(TRIM(type), ''), 'Other')
    WHERE reason IS NOT NULL
  `);

  // Keep human label in description when present.
  await pgm.db.query(`
    UPDATE reports
    SET description = NULLIF(
      TRIM(BOTH E'\\n' FROM CONCAT_WS(
        E'\\n',
        NULLIF(TRIM(target_label), ''),
        NULLIF(TRIM(description), '')
      )),
      ''
    )
    WHERE target_label IS NOT NULL
      AND TRIM(target_label) <> ''
  `);

  await pgm.db.query(`
    ALTER TABLE reports
      DROP COLUMN IF EXISTS resolved_at,
      DROP COLUMN IF EXISTS target_label,
      DROP COLUMN IF EXISTS reason
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS target_label VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reason VARCHAR(100)
  `);

  await pgm.db.query(`
    UPDATE reports
    SET reason = type
    WHERE reason IS NULL
  `);

  await pgm.db.query(`
    UPDATE reports
    SET resolved_at = updated_at
    WHERE resolved_at IS NULL
      AND LOWER(status) IN ('resolved', 'closed', 'dismissed')
  `);
};
