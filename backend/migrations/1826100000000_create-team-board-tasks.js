/**
 * Migration: Create team_board_tasks table for general team taskboards
 * Allows team members to manage tasks without contract milestone restrictions.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('team_board_tasks', {
    task_id: {
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
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'todo',
    },
    priority: {
      type: 'varchar(20)',
      notNull: true,
      default: 'normal',
    },
    due_at: {
      type: 'timestamp with time zone',
    },
    assignee_account_id: {
      type: 'uuid',
      references: 'accounts(account_id)',
      onDelete: 'SET NULL',
    },
    created_by_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts(account_id)',
      onDelete: 'CASCADE',
    },
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  pgm.addConstraint('team_board_tasks', 'team_board_tasks_status_check', {
    check: "status IN ('todo', 'in_progress', 'in_review', 'completed')",
  });

  pgm.addConstraint('team_board_tasks', 'team_board_tasks_priority_check', {
    check: "priority IN ('low', 'normal', 'high', 'urgent')",
  });

  pgm.createIndex('team_board_tasks', ['team_id', 'status', 'sort_order']);
  pgm.createIndex('team_board_tasks', ['team_id', 'due_at']);
  pgm.createIndex('team_board_tasks', ['assignee_account_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('team_board_tasks', { ifExists: true });
};
