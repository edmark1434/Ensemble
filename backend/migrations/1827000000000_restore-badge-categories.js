/**
 * Restore badge_categories and point the badges entity at it.
 * Existing category strings are copied into rows, then badges.category is dropped.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS badge_categories (
      badge_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITHOUT TIME ZONE
    )
  `);

  const { rows: columnRows } = await pgm.db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'badges'
  `);
  const columns = new Set(columnRows.map((row) => row.column_name));
  const hasCategoryText = columns.has('category');
  const hasCategoryId = columns.has('badge_category_id');

  if (hasCategoryText) {
    await pgm.db.query(`
      INSERT INTO badge_categories (name, description)
      SELECT DISTINCT ON (lower(BTRIM(category))) BTRIM(category), BTRIM(category)
      FROM badges
      WHERE NULLIF(BTRIM(category), '') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM badge_categories bc
          WHERE lower(bc.name) = lower(BTRIM(badges.category))
        )
      ORDER BY lower(BTRIM(category)), created_at
    `);
  }

  await pgm.db.query(`
    INSERT INTO badge_categories (name, description)
    SELECT v.name, v.description
    FROM (VALUES
      ('Milestones', 'Account, profile, and rank achievements'),
      ('Marketplace', 'Asset library creator ranks')
    ) AS v(name, description)
    WHERE NOT EXISTS (
      SELECT 1 FROM badge_categories bc
      WHERE lower(bc.name) = lower(v.name) AND bc.deleted_at IS NULL
    )
  `);
  await pgm.db.query(`
    UPDATE badge_categories
    SET description = 'Account, profile, and rank achievements', updated_at = CURRENT_TIMESTAMP
    WHERE lower(name) = 'milestones' AND description = name
  `);
  await pgm.db.query(`
    UPDATE badge_categories
    SET description = 'Asset library creator ranks', updated_at = CURRENT_TIMESTAMP
    WHERE lower(name) = 'marketplace' AND description = name
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS badge_categories_name_live_uidx
      ON badge_categories (LOWER(name))
      WHERE deleted_at IS NULL
  `);

  if (!hasCategoryId) {
    await pgm.db.query(`ALTER TABLE badges ADD COLUMN badge_category_id UUID`);
  }

  if (hasCategoryText) {
    await pgm.db.query(`
      UPDATE badges b
      SET badge_category_id = bc.badge_category_id
      FROM badge_categories bc
      WHERE b.badge_category_id IS NULL
        AND lower(bc.name) = lower(b.category)
        AND bc.deleted_at IS NULL
    `);
  }

  await pgm.db.query(`
    UPDATE badges
    SET badge_category_id = (
      SELECT badge_category_id FROM badge_categories
      WHERE lower(name) = 'milestones' AND deleted_at IS NULL
      ORDER BY created_at
      LIMIT 1
    )
    WHERE badge_category_id IS NULL
  `);
  await pgm.db.query(`ALTER TABLE badges ALTER COLUMN badge_category_id SET NOT NULL`);
  await pgm.db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'badges_badge_category_id_fkey'
      ) THEN
        ALTER TABLE badges
          ADD CONSTRAINT badges_badge_category_id_fkey
          FOREIGN KEY (badge_category_id) REFERENCES badge_categories(badge_category_id);
      END IF;
    END $$
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS badges_badge_category_id_idx
      ON badges (badge_category_id)
  `);

  if (hasCategoryText) {
    await pgm.db.query(`ALTER TABLE badges DROP COLUMN IF EXISTS category`);
  }
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
