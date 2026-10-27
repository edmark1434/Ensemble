/**
 * Per-badge AND requirements. Empty means honorary (admin grant only).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('badge_requirements', {
    badge_requirement_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    badge_id: { type: 'uuid', notNull: true },
    code: { type: 'varchar(50)', notNull: true },
    threshold: { type: 'integer', notNull: true, default: 1 },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint(
    'badge_requirements',
    'badge_requirements_badge_id_fkey',
    'FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON DELETE CASCADE'
  );
  pgm.addConstraint('badge_requirements', 'badge_requirements_badge_code_uidx', {
    unique: ['badge_id', 'code'],
  });
  pgm.addConstraint('badge_requirements', 'badge_requirements_threshold_check', {
    check: 'threshold >= 1',
  });
  pgm.createIndex('badge_requirements', 'code', { name: 'badge_requirements_code_idx' });

  pgm.sql(`
    INSERT INTO badge_requirements (badge_id, code, threshold, sort_order)
    SELECT
      badge_id,
      CASE trigger_event_code
        WHEN 'gig_completed' THEN 'freelance_close'
        WHEN 'contract_funded' THEN 'client_close'
        ELSE trigger_event_code
      END,
      GREATEST(COALESCE(condition_value, 1), 1),
      0
    FROM badges
    WHERE deleted_at IS NULL
      AND registry_id IS NOT NULL
      AND trigger_event_code IS NOT NULL
      AND trigger_event_code NOT IN ('admin_grant')
    ON CONFLICT (badge_id, code) DO NOTHING
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('badge_requirements', { ifExists: true });
};
