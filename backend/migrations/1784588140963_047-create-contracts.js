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
  pgm.createTable('contracts', {
    contract_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    contract_type: { type: 'varchar(50)', notNull: true },
    payment_type: { type: 'varchar(50)', notNull: true },
    starts_at: { type: 'timestamp without time zone', notNull: true },
    rate_credits: { type: 'integer', notNull: true },
    weekly_hrs_max: { type: 'integer' },
    total_hrs: { type: 'integer' },
    revision_price_credits: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    is_private: { type: 'boolean', notNull: true, default: false },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
  });
};
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('contracts', { ifExists: true });
};

