/**
 * Admin freeze metadata for editor projects. Status itself stays on projects.status.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  pgm.addColumns('projects', {
    status_before_freeze: { type: 'varchar(50)' },
    moderation_note: { type: 'text' },
    frozen_at: { type: 'timestamp without time zone' },
    frozen_by_staff_id: {
      type: 'uuid',
      references: 'staff(staff_id)',
      onDelete: 'SET NULL',
    },
  });
};

exports.down = async (pgm) => {
  pgm.dropColumns('projects', [
    'status_before_freeze',
    'moderation_note',
    'frozen_at',
    'frozen_by_staff_id',
  ]);
};
