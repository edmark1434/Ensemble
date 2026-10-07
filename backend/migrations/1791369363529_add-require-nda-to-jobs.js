exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.addColumn('jobs', {
        require_nda: { type: 'boolean', default: false, notNull: true }
    });
};

exports.down = (pgm) => {
    pgm.dropColumn('jobs', 'require_nda');
};
