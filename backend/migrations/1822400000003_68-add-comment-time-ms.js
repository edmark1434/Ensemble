exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.addColumn('project_comments', { time_ms: { type: 'integer' } });
    pgm.addColumn('block_comments', { time_ms: { type: 'integer' } });
};

exports.down = (pgm) => {
    pgm.dropColumn('block_comments', 'time_ms');
    pgm.dropColumn('project_comments', 'time_ms');
};