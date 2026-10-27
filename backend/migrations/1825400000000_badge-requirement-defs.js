/**
 * Named, reusable badge requirement library. Existing product badges
 * attach the defs that match their catalog rules.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const {
  NAMED_REQUIREMENTS,
  EXISTING_BADGE_REQUIREMENTS,
} = require('../lib/BadgeRequirements');

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

exports.up = (pgm) => {
  pgm.createTable('badge_requirement_defs', {
    requirement_def_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    slug: { type: 'varchar(80)', notNull: true },
    name: { type: 'varchar(80)', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    metric: { type: 'varchar(50)', notNull: true },
    operator: { type: 'varchar(10)', notNull: true, default: 'gte' },
    threshold: { type: 'integer', notNull: true, default: 1 },
    is_system: { type: 'boolean', notNull: true, default: false },
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

  pgm.addConstraint('badge_requirement_defs', 'badge_requirement_defs_slug_uidx', {
    unique: ['slug'],
  });
  pgm.addConstraint('badge_requirement_defs', 'badge_requirement_defs_operator_check', {
    check: "operator IN ('gte', 'eq', 'lte')",
  });
  pgm.addConstraint('badge_requirement_defs', 'badge_requirement_defs_threshold_check', {
    check: 'threshold >= 1',
  });
  pgm.createIndex('badge_requirement_defs', ['metric', 'operator', 'threshold'], {
    name: 'badge_requirement_defs_shape_idx',
    where: 'deleted_at IS NULL',
  });

  const seedRows = NAMED_REQUIREMENTS.map((def) => `(
    ${sqlString(def.slug)},
    ${sqlString(def.name)},
    ${sqlString(def.description || '')},
    ${sqlString(def.metric)},
    ${sqlString(def.operator)},
    ${Number(def.threshold)},
    true
  )`).join(',\n    ');

  pgm.sql(`
    INSERT INTO badge_requirement_defs (slug, name, description, metric, operator, threshold, is_system)
    VALUES ${seedRows}
    ON CONFLICT (slug) DO NOTHING
  `);

  pgm.addColumns('badge_requirements', {
    requirement_def_id: { type: 'uuid' },
    operator: { type: 'varchar(10)', notNull: true, default: 'gte' },
  });
  pgm.addConstraint(
    'badge_requirements',
    'badge_requirements_requirement_def_id_fkey',
    'FOREIGN KEY (requirement_def_id) REFERENCES badge_requirement_defs(requirement_def_id)'
  );
  pgm.addConstraint('badge_requirements', 'badge_requirements_operator_check', {
    check: "operator IN ('gte', 'eq', 'lte')",
  });

  pgm.sql(`
    UPDATE badge_requirements br
    SET requirement_def_id = d.requirement_def_id,
        operator = d.operator
    FROM badge_requirement_defs d
    WHERE d.deleted_at IS NULL
      AND d.metric = br.code
      AND d.threshold = br.threshold
      AND br.requirement_def_id IS NULL
  `);

  pgm.sql(`
    INSERT INTO badge_requirement_defs (slug, name, description, metric, operator, threshold, is_system)
    SELECT
      br.code || '-' || br.threshold::text,
      br.code,
      '',
      br.code,
      'gte',
      br.threshold,
      false
    FROM badge_requirements br
    WHERE br.requirement_def_id IS NULL
    ON CONFLICT (slug) DO NOTHING
  `);

  pgm.sql(`
    UPDATE badge_requirements br
    SET requirement_def_id = d.requirement_def_id,
        operator = COALESCE(NULLIF(br.operator, ''), d.operator)
    FROM badge_requirement_defs d
    WHERE br.requirement_def_id IS NULL
      AND d.deleted_at IS NULL
      AND d.slug = br.code || '-' || br.threshold::text
  `);

  const attachSql = Object.entries(EXISTING_BADGE_REQUIREMENTS).flatMap(([registryId, slugs]) =>
    slugs.map((slug, index) => `
      INSERT INTO badge_requirements (badge_id, code, threshold, sort_order, requirement_def_id, operator)
      SELECT b.badge_id, d.metric, d.threshold, ${index}, d.requirement_def_id, d.operator
      FROM badges b
      JOIN badge_requirement_defs d ON d.slug = ${sqlString(slug)} AND d.deleted_at IS NULL
      WHERE b.registry_id = ${sqlString(registryId)} AND b.deleted_at IS NULL
      ON CONFLICT (badge_id, code) DO UPDATE
        SET requirement_def_id = EXCLUDED.requirement_def_id,
            operator = EXCLUDED.operator,
            threshold = EXCLUDED.threshold,
            sort_order = EXCLUDED.sort_order
    `)
  ).join(';');

  pgm.sql(attachSql);

  pgm.sql(`
    DELETE FROM badge_requirements WHERE requirement_def_id IS NULL
  `);

  pgm.alterColumn('badge_requirements', 'requirement_def_id', { notNull: true });
  pgm.dropConstraint('badge_requirements', 'badge_requirements_badge_code_uidx');
  pgm.addConstraint('badge_requirements', 'badge_requirements_badge_def_uidx', {
    unique: ['badge_id', 'requirement_def_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('badge_requirements', 'badge_requirements_badge_def_uidx');
  pgm.addConstraint('badge_requirements', 'badge_requirements_badge_code_uidx', {
    unique: ['badge_id', 'code'],
  });
  pgm.dropConstraint('badge_requirements', 'badge_requirements_operator_check');
  pgm.dropConstraint('badge_requirements', 'badge_requirements_requirement_def_id_fkey');
  pgm.dropColumns('badge_requirements', ['requirement_def_id', 'operator']);
  pgm.dropTable('badge_requirement_defs', { ifExists: true });
};
