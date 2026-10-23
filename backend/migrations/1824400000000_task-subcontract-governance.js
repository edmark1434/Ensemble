/**
 * Create team subcontract proposals and proposal members for governance and client approval
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  // 1. Proposals table for batch subcontract invitations
  pgm.createTable('team_subcontract_proposals', {
    proposal_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    team_id: {
      type: 'uuid',
      notNull: true,
      references: 'teams',
      onDelete: 'CASCADE',
    },
    contract_id: {
      type: 'uuid',
      notNull: true,
      references: 'contracts',
      onDelete: 'CASCADE',
    },
    lead_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
      onDelete: 'CASCADE',
    },
    status: {
      type: 'varchar(40)',
      notNull: true,
      default: 'pending', // 'pending', 'approved', 'partially_approved', 'rejected', 'withdrawn'
    },
    terms_accepted: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    terms_accepted_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    proposal_notes: {
      type: 'text',
      default: null,
    },
    client_feedback: {
      type: 'text',
      default: null,
    },
    reviewed_by_account_id: {
      type: 'uuid',
      references: 'accounts',
      onDelete: 'SET NULL',
    },
    reviewed_at: {
      type: 'timestamp with time zone',
      default: null,
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
  });

  pgm.createIndex('team_subcontract_proposals', 'team_id');
  pgm.createIndex('team_subcontract_proposals', 'contract_id');
  pgm.createIndex('team_subcontract_proposals', 'lead_account_id');
  pgm.createIndex('team_subcontract_proposals', 'status');

  // 2. Proposal candidates / members table (multi-member selection per proposal)
  pgm.createTable('team_subcontract_proposal_members', {
    proposal_member_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    proposal_id: {
      type: 'uuid',
      notNull: true,
      references: 'team_subcontract_proposals',
      onDelete: 'CASCADE',
    },
    contract_id: {
      type: 'uuid',
      notNull: true,
      references: 'contracts',
      onDelete: 'CASCADE',
    },
    candidate_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
      onDelete: 'CASCADE',
    },
    role_title: {
      type: 'varchar(120)',
      notNull: true,
      default: 'Video Editor',
    },
    assigned_milestone_id: {
      type: 'uuid',
      references: 'job_milestones',
      onDelete: 'SET NULL',
    },
    agreed_credits: {
      type: 'integer',
      default: null,
    },
    permissions: {
      type: 'jsonb',
      notNull: true,
      default: '{"can_view_tasks": true, "can_update_task_status": true, "can_upload_drafts": true, "can_create_subtasks": false}',
    },
    status: {
      type: 'varchar(40)',
      notNull: true,
      default: 'pending', // 'pending', 'approved', 'rejected', 'withdrawn'
    },
    client_notes: {
      type: 'text',
      default: null,
    },
    decided_at: {
      type: 'timestamp with time zone',
      default: null,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('team_subcontract_proposal_members', 'proposal_id');
  pgm.createIndex('team_subcontract_proposal_members', 'candidate_account_id');
  pgm.createIndex('team_subcontract_proposal_members', 'assigned_milestone_id');
  pgm.createIndex('team_subcontract_proposal_members', 'status');

  // 3. Extend contract_subcontractors with assigned milestone, parent contractor, permissions
  pgm.addColumns('contract_subcontractors', {
    assigned_milestone_id: {
      type: 'uuid',
      references: 'job_milestones',
      onDelete: 'SET NULL',
      default: null,
    },
    parent_contractor_account_id: {
      type: 'uuid',
      references: 'accounts',
      onDelete: 'SET NULL',
      default: null,
    },
    permissions: {
      type: 'jsonb',
      notNull: true,
      default: '{"can_view_tasks": true, "can_update_task_status": true, "can_upload_drafts": true, "can_create_subtasks": false}',
    },
    proposal_member_id: {
      type: 'uuid',
      references: 'team_subcontract_proposal_members',
      onDelete: 'SET NULL',
      default: null,
    },
  });
};

exports.down = async (pgm) => {
  pgm.dropColumns('contract_subcontractors', [
    'assigned_milestone_id',
    'parent_contractor_account_id',
    'permissions',
    'proposal_member_id',
  ]);
  pgm.dropTable('team_subcontract_proposal_members', { ifExists: true });
  pgm.dropTable('team_subcontract_proposals', { ifExists: true });
};
