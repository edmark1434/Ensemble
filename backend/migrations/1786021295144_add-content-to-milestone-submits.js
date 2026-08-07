/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('milestone_submits', {
        message: { type: 'text' },
        attachments: { type: 'jsonb', default: '[]' }
    });
};

exports.down = pgm => {
    pgm.dropColumns('milestone_submits', ['message', 'attachments']);
};
