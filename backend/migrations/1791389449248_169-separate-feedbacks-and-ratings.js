/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Rename existing table
  pgm.renameTable('feedbacks', 'platform_feedbacks');

  // 2. Add 'category' column to platform_feedbacks and drop 'rating'
  pgm.addColumn('platform_feedbacks', {
    category: {
      type: 'varchar(50)',
      notNull: true,
      default: 'General Insight',
    }
  });
  pgm.dropColumn('platform_feedbacks', 'rating');

  // 3. Create platform_ratings table
  pgm.createTable('platform_ratings', {
    account_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      references: '"accounts"',
      onDelete: 'CASCADE',
    },
    rating: {
      type: 'integer',
      notNull: true,
      check: 'rating >= 1 AND rating <= 5',
    },
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
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('platform_ratings', { ifExists: true });
  pgm.addColumn('platform_feedbacks', {
    rating: {
      type: 'integer',
      notNull: true,
      default: 5,
    }
  });
  pgm.dropColumn('platform_feedbacks', 'category');
  pgm.renameTable('platform_feedbacks', 'feedbacks');
};
