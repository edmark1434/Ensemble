/**
 * Migration to link video projects to General Teams.
 * Enables team leaders to create video projects where all active team members
 * automatically receive collaborative editor access.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('team_video_projects', {
    team_video_project_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    team_id: {
      type: 'uuid',
      notNull: true,
      references: 'teams(team_id)',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects(project_id)',
      onDelete: 'CASCADE',
    },
    created_by_account_id: {
      type: 'uuid',
      references: 'accounts(account_id)',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('team_video_projects', 'team_video_projects_unique', {
    unique: ['team_id', 'project_id'],
  });

  pgm.createIndex('team_video_projects', 'team_id');
  pgm.createIndex('team_video_projects', 'project_id');
};

exports.down = (pgm) => {
  pgm.dropTable('team_video_projects');
};
