exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('jobs', {
    portfolio_use_allowed: { type: 'boolean', default: false },
    portfolio_use_duration_seconds: { type: 'integer' },
    is_existing_project: { type: 'boolean', default: false },
    existing_project_id: { type: 'uuid' },
    initiator_role: { type: 'varchar(50)' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('jobs', [
    'portfolio_use_allowed',
    'portfolio_use_duration_seconds',
    'is_existing_project',
    'existing_project_id',
    'initiator_role'
  ]);
};
