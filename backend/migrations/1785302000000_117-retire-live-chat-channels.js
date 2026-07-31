/**
 * Retire live-chat ticket channels. Support is ticket-only;
 * migrate chat / live / messenger channels to web.
 *
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE tickets
    SET channel = 'web',
        updated_at = NOW()
    WHERE deleted_at IS NULL
      AND LOWER(channel) IN ('chat', 'live', 'messenger')
  `);
};

exports.down = () => {
  // Irreversible: previous channel values are not retained.
};
