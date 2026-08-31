exports.up = (pgm) => {
  pgm.dropConstraint('team_workspace_tasks', 'team_workspace_tasks_status_check');
  pgm.addConstraint('team_workspace_tasks', 'team_workspace_tasks_status_check', {
    check: "status IN ('todo', 'in_progress', 'in_review', 'overdue', 'completed')",
  });
  pgm.addColumn('team_workspace_tasks', {
    overdue_notified_at: { type: 'timestamp with time zone' },
  });
  pgm.createIndex(
    'notifications',
    ['account_id', 'reference_id', 'reference_prefix'],
    {
      name: 'notifications_team_task_due_once',
      unique: true,
      where: "reference_table = 'team_workspace_tasks' AND reference_prefix = 'TEAM_TASK_DUE' AND deleted_at IS NULL",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropIndex('notifications', ['account_id', 'reference_id', 'reference_prefix'], {
    name: 'notifications_team_task_due_once',
    ifExists: true,
  });
  pgm.dropColumn('team_workspace_tasks', 'overdue_notified_at', { ifExists: true });
  pgm.sql("UPDATE team_workspace_tasks SET status = 'in_progress' WHERE status = 'overdue'");
  pgm.dropConstraint('team_workspace_tasks', 'team_workspace_tasks_status_check');
  pgm.addConstraint('team_workspace_tasks', 'team_workspace_tasks_status_check', {
    check: "status IN ('todo', 'in_progress', 'in_review', 'completed')",
  });
};
