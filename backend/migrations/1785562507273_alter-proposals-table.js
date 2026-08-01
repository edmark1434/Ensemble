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
  pgm.addColumns('proposals', {
    terms_id: { type: 'uuid' },
    reject_reason: { type: 'varchar(255)' }
  });

  pgm.addConstraint('proposals', 'proposals_terms_id_fkey', 'FOREIGN KEY (terms_id) REFERENCES terms_of_service(terms_id)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('proposals', 'proposals_terms_id_fkey', { ifExists: true });
  pgm.dropColumns('proposals', ['terms_id', 'reject_reason']);
};
