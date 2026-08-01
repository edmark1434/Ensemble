/**
 * Remove dispute/ticket takeover request columns.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropConstraint('disputes', 'disputes_takeover_requested_by_staff_id_fkey', { ifExists: true });
  pgm.dropColumns(
    'disputes',
    ['takeover_requested_by_staff_id', 'takeover_requested_at', 'takeover_request_note'],
    { ifExists: true }
  );

  pgm.dropIndex('tickets', 'takeover_requested_by_staff_id', {
    name: 'idx_tickets_takeover_requested_by',
    ifExists: true,
  });
  pgm.dropConstraint('tickets', 'tickets_takeover_requested_by_staff_id_fkey', { ifExists: true });
  pgm.dropColumns(
    'tickets',
    [
      'takeover_requested_by_staff_id',
      'takeover_requested_at',
      'takeover_request_note',
      'takeover_mode',
    ],
    { ifExists: true }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.addColumns('disputes', {
    takeover_requested_by_staff_id: { type: 'uuid' },
    takeover_requested_at: { type: 'timestamptz' },
    takeover_request_note: { type: 'text' },
  });
  pgm.addConstraint(
    'disputes',
    'disputes_takeover_requested_by_staff_id_fkey',
    'FOREIGN KEY (takeover_requested_by_staff_id) REFERENCES staff(staff_id)'
  );

  pgm.addColumns('tickets', {
    takeover_requested_by_staff_id: { type: 'uuid' },
    takeover_requested_at: { type: 'timestamptz' },
    takeover_request_note: { type: 'text' },
    takeover_mode: { type: 'text' },
  });
  pgm.addConstraint(
    'tickets',
    'tickets_takeover_requested_by_staff_id_fkey',
    'FOREIGN KEY (takeover_requested_by_staff_id) REFERENCES staff(staff_id)'
  );
  pgm.createIndex('tickets', 'takeover_requested_by_staff_id', {
    name: 'idx_tickets_takeover_requested_by',
  });
};
