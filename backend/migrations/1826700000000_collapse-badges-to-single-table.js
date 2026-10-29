/**
 * One catalog table. Copy the category name onto badges, keep the single
 * unlock rule already on the row, and drop badge_categories plus the
 * requirement library tables if they exist.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumn('badges', {
    category: { type: 'varchar(50)' },
  });

  pgm.sql(`
    UPDATE badges b
    SET category = COALESCE(NULLIF(BTRIM(bc.name), ''), 'Milestones')
    FROM badge_categories bc
    WHERE bc.badge_category_id = b.badge_category_id
      AND b.category IS NULL
  `);
  pgm.sql(`UPDATE badges SET category = 'Milestones' WHERE category IS NULL OR BTRIM(category) = ''`);
  pgm.alterColumn('badges', 'category', { notNull: true, default: 'Milestones' });

  pgm.sql(`
    UPDATE badges
    SET trigger_event_code = CASE trigger_event_code
      WHEN 'gig_completed' THEN 'freelance_close'
      WHEN 'contract_funded' THEN 'client_close'
      WHEN 'custom' THEN 'admin_grant'
      ELSE trigger_event_code
    END
    WHERE trigger_event_code IN ('gig_completed', 'contract_funded', 'custom')
  `);

  pgm.dropTable('badge_requirements', { ifExists: true, cascade: true });
  pgm.dropTable('badge_requirement_defs', { ifExists: true, cascade: true });
  pgm.dropConstraint('badges', 'badges_badge_category_id_fkey', { ifExists: true });
  pgm.dropColumn('badges', 'badge_category_id', { ifExists: true });
  pgm.dropTable('badge_categories', { ifExists: true, cascade: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.createTable('badge_categories', {
    badge_category_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.sql(`
    INSERT INTO badge_categories (name, description)
    SELECT DISTINCT category, category
    FROM badges
    WHERE NULLIF(BTRIM(category), '') IS NOT NULL
  `);
  pgm.sql(`
    INSERT INTO badge_categories (name, description)
    SELECT 'Milestones', 'Progress and completion achievements'
    WHERE NOT EXISTS (SELECT 1 FROM badge_categories)
  `);

  pgm.addColumn('badges', {
    badge_category_id: { type: 'uuid' },
  });
  pgm.sql(`
    UPDATE badges b
    SET badge_category_id = bc.badge_category_id
    FROM badge_categories bc
    WHERE bc.name = b.category
  `);
  pgm.sql(`
    UPDATE badges
    SET badge_category_id = (SELECT badge_category_id FROM badge_categories ORDER BY name LIMIT 1)
    WHERE badge_category_id IS NULL
  `);
  pgm.alterColumn('badges', 'badge_category_id', { notNull: true });
  pgm.addConstraint(
    'badges',
    'badges_badge_category_id_fkey',
    'FOREIGN KEY (badge_category_id) REFERENCES badge_categories(badge_category_id)'
  );
  pgm.dropColumn('badges', 'category');
};
