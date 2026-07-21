/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('market_assets', {
    market_asset_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    name: { type: 'varchar(50)', notNull: true },
    description: { type: 'text', notNull: true },
    price_credits: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: { type: 'timestamp without time zone', notNull: true },
    updated_at: { type: 'timestamp without time zone', notNull: true },
    deleted_at: { type: 'timestamp without time zone' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('market_assets', { ifExists: true });
};
