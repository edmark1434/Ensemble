exports.up = (pgm) => {
  pgm.addColumns('gig_requests', {
    initiator_role: { type: 'varchar(50)', notNull: false },
    linked_project_id: { type: 'uuid', notNull: false, references: 'projects(project_id)', onDelete: 'SET NULL' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('gig_requests', ['initiator_role', 'linked_project_id']);
};
