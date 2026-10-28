/**
 * Warnings are always temporary. Backfill missing expiries from the point ladder
 * (1→3d … 5→14d … 10→90d) and mark already-lapsed rows expired.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE violations
    SET expires_at = created_at + (
      CASE LEAST(GREATEST(COALESCE(points, 1), 1), 10)
        WHEN 1 THEN INTERVAL '3 days'
        WHEN 2 THEN INTERVAL '5 days'
        WHEN 3 THEN INTERVAL '7 days'
        WHEN 4 THEN INTERVAL '10 days'
        WHEN 5 THEN INTERVAL '14 days'
        WHEN 6 THEN INTERVAL '21 days'
        WHEN 7 THEN INTERVAL '30 days'
        WHEN 8 THEN INTERVAL '45 days'
        WHEN 9 THEN INTERVAL '60 days'
        ELSE INTERVAL '90 days'
      END
    )
    WHERE expires_at IS NULL
      AND deleted_at IS NULL
  `);

  pgm.sql(`
    UPDATE violations
    SET status = 'expired'
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = () => {
  // Expiry timestamps are the live contract. Do not reopen lapsed warnings.
};
