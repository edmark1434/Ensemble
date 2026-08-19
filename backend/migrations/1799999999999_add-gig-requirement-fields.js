exports.up = pgm => {
  pgm.addColumns('gig_requirements', {
    multiple_answer: { type: 'boolean', default: false },
    file_types: { type: 'jsonb', default: '[]' },
    file_limit: { type: 'integer' }
  });
};

exports.down = pgm => {
  pgm.dropColumns('gig_requirements', ['multiple_answer', 'file_types', 'file_limit']);
};
