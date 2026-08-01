/**
 * Normalize dispute status to workflow-only values.
 * Closed decisions live in `outcome` (resolved / sanctioned / dismissed / withdrawn).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE disputes
    SET
      outcome = COALESCE(NULLIF(LOWER(outcome), ''), LOWER(status)),
      status = 'closed',
      resolved_at = COALESCE(resolved_at, NOW()),
      updated_at = NOW()
    WHERE LOWER(COALESCE(status, '')) IN ('resolved', 'sanctioned', 'dismissed', 'withdrawn')
  `);

  pgm.sql(`
    UPDATE disputes
    SET
      outcome = COALESCE(NULLIF(LOWER(outcome), ''), 'resolved'),
      resolved_at = COALESCE(resolved_at, NOW()),
      updated_at = NOW()
    WHERE LOWER(COALESCE(status, '')) = 'closed'
      AND (outcome IS NULL OR TRIM(outcome) = '')
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  // Best-effort restore: closed + outcome → status = outcome (or resolved).
  pgm.sql(`
    UPDATE disputes
    SET
      status = COALESCE(NULLIF(LOWER(outcome), ''), 'resolved'),
      updated_at = NOW()
    WHERE LOWER(COALESCE(status, '')) = 'closed'
  `);
};
