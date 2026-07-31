/**
 * Ticket assignment handover — same model as dispute takeover.
 *
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('tickets', {
    takeover_requested_by_staff_id: { type: 'uuid' },
    takeover_requested_at: { type: 'timestamptz' },
    takeover_request_note: { type: 'text' },
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

exports.down = (pgm) => {
  pgm.dropIndex('tickets', 'takeover_requested_by_staff_id', {
    name: 'idx_tickets_takeover_requested_by',
    ifExists: true,
  });
  pgm.dropConstraint('tickets', 'tickets_takeover_requested_by_staff_id_fkey', { ifExists: true });
  pgm.dropColumns(
    'tickets',
    ['takeover_requested_by_staff_id', 'takeover_requested_at', 'takeover_request_note'],
    { ifExists: true }
  );
};
