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
  pgm.createTable('gig_responses', {
    gig_response_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    response: { type: 'text', notNull: true },
    gig_request_id: { type: 'uuid', notNull: true },
    gig_requirement_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('gig_responses', 'gig_responses_gig_request_id_fkey', 'FOREIGN KEY (gig_request_id) REFERENCES gig_requests(gig_request_id)');
  pgm.addConstraint('gig_responses', 'gig_responses_gig_requirement_id_fkey', 'FOREIGN KEY (gig_requirement_id) REFERENCES gig_requirements(gig_requirement_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('gig_responses', { ifExists: true });
};

