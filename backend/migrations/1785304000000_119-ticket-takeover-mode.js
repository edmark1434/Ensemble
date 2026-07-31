/**
 * Distinguish volunteer "ask to take over" vs handler open "request takeover" (relief).
 *
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('tickets', {
    takeover_mode: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('tickets', ['takeover_mode'], { ifExists: true });
};
