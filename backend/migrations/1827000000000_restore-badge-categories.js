/**
 * Restore badge_categories and point badges at it. Category stays a
 * catalog label, not an unlock rule.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
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
    SELECT DISTINCT ON (lower(BTRIM(category))) BTRIM(category), BTRIM(category)
    FROM badges
    WHERE NULLIF(BTRIM(category), '') IS NOT NULL
    ORDER BY lower(BTRIM(category)), created_at
  `);
  pgm.sql(`
    INSERT INTO badge_categories (name, description)
    SELECT v.name, v.description
    FROM (VALUES
      ('Milestones', 'Account, profile, and rank achievements'),
      ('Marketplace', 'Asset library creator ranks')
    ) AS v(name, description)
    WHERE NOT EXISTS (
      SELECT 1 FROM badge_categories bc
      WHERE lower(bc.name) = lower(v.name)
    )
  `);
  pgm.sql(`
    UPDATE badge_categories
    SET description = 'Account, profile, and rank achievements'
    WHERE lower(name) = 'milestones' AND description = name
  `);
  pgm.sql(`
    UPDATE badge_categories
    SET description = 'Asset library creator ranks'
    WHERE lower(name) = 'marketplace' AND description = name
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX badge_categories_name_live_uidx
      ON badge_categories (LOWER(name))
      WHERE deleted_at IS NULL
  `);

  pgm.addColumn('badges', {
    badge_category_id: { type: 'uuid' },
  });
  pgm.sql(`
    UPDATE badges b
    SET badge_category_id = bc.badge_category_id
    FROM badge_categories bc
    WHERE lower(bc.name) = lower(b.category)
  `);
  pgm.sql(`
    UPDATE badges
    SET badge_category_id = (
      SELECT badge_category_id FROM badge_categories
      WHERE lower(name) = 'milestones'
      ORDER BY created_at
      LIMIT 1
    )
    WHERE badge_category_id IS NULL
  `);
  pgm.alterColumn('badges', 'badge_category_id', { notNull: true });
  pgm.addConstraint(
    'badges',
    'badges_badge_category_id_fkey',
    'FOREIGN KEY (badge_category_id) REFERENCES badge_categories(badge_category_id)'
  );
  pgm.createIndex('badges', 'badge_category_id', { name: 'badges_badge_category_id_idx' });
  pgm.dropColumn('badges', 'category');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.addColumn('badges', {
    category: { type: 'varchar(50)' },
  });
  pgm.sql(`
    UPDATE badges b
    SET category = COALESCE(NULLIF(BTRIM(bc.name), ''), 'Milestones')
    FROM badge_categories bc
    WHERE bc.badge_category_id = b.badge_category_id
  `);
  pgm.sql(`UPDATE badges SET category = 'Milestones' WHERE category IS NULL OR BTRIM(category) = ''`);
  pgm.alterColumn('badges', 'category', { notNull: true, default: 'Milestones' });
  pgm.dropConstraint('badges', 'badges_badge_category_id_fkey', { ifExists: true });
  pgm.sql('DROP INDEX IF EXISTS badges_badge_category_id_idx');
  pgm.dropColumn('badges', 'badge_category_id', { ifExists: true });
  pgm.dropTable('badge_categories', { ifExists: true, cascade: true });
};
