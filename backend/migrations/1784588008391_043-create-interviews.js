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
  pgm.createTable('interviews', {
    interview_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    session_code: { type: 'varchar(50)', notNull: true },
    scheduled_at: { type: 'timestamp without time zone', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    started_at: { type: 'timestamp without time zone', notNull: true },
    ended_at: { type: 'timestamp without time zone', notNull: true },
    expired_at: { type: 'timestamp without time zone', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: { type: 'timestamp without time zone' },
    proposal_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('interviews', 'interviews_proposal_id_fkey', 'FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('interviews', { ifExists: true });
};
