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
  pgm.createTable('blocks', {
    block_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    name: { type: 'varchar(50)', notNull: true },
    resolution_width: { type: 'integer', notNull: true },
    resolution_height: { type: 'integer', notNull: true },
    color_space: { type: 'varchar(50)', notNull: true },
    frame_rate: { type: 'integer', notNull: true },
    project_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('blocks', 'blocks_project_id_fkey', 'FOREIGN KEY (project_id) REFERENCES projects(project_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('blocks', { ifExists: true });
};