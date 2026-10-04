exports.up = (pgm) => {
  pgm.createTable('job_invitations', {
    invitation_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    job_id: { type: 'uuid', notNull: true, references: '"jobs"', onDelete: 'CASCADE' },
    client_account_id: { type: 'uuid', notNull: true, references: '"accounts"', onDelete: 'CASCADE' },
    freelancer_account_id: { type: 'uuid', notNull: true, references: '"accounts"', onDelete: 'CASCADE' },
    status: { type: 'varchar(50)', notNull: true, default: 'pending' },
    message: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
  });

  pgm.addConstraint('job_invitations', 'unique_job_freelancer_invite', {
    unique: ['job_id', 'freelancer_account_id']
  });

  pgm.createIndex('job_invitations', 'freelancer_account_id');
  pgm.createIndex('job_invitations', 'job_id');
};

exports.down = (pgm) => {
  pgm.dropTable('job_invitations');
};