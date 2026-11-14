/**
 * Staff note for a marketplace listing moderation action that is not a rejection:
 * delisting a live asset, or sending an approved asset back for re-approval after a
 * copyright flag. `rejection_reason` stays reserved for rejections.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('marketplace_listings', {
    moderation_note: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('marketplace_listings', 'moderation_note', { ifExists: true });
};
