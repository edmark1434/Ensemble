/**
 * Track who last messaged on a ticket (user vs staff) for "awaiting reply" desk tags.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('tickets', {
    last_message_author_type: { type: 'varchar(20)' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns('tickets', ['last_message_author_type'], { ifExists: true });
};
