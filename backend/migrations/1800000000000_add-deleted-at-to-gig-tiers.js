exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('gig_tiers', { deleted_at: { type: 'timestamp without time zone', notNull: false } }, { ifNotExists: true });
  pgm.addColumn('gig_requirements', { deleted_at: { type: 'timestamp without time zone', notNull: false } }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropColumn('gig_tiers', 'deleted_at', { ifExists: true });
  pgm.dropColumn('gig_requirements', 'deleted_at', { ifExists: true });
};
