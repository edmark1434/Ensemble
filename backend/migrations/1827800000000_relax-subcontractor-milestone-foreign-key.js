/**
 * Migration: 1827800000000_relax-subcontractor-milestone-foreign-key.js
 * Drops the strict FK constraint to job_milestones on assigned_milestone_id for both
 * team_subcontract_proposal_members and contract_subcontractors.
 * This allows assigned_milestone_id to hold milestone references for jobs, contract_milestones, or gig milestones.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.dropConstraint(
    'team_subcontract_proposal_members',
    'team_subcontract_proposal_members_assigned_milestone_id_fkey',
    { ifExists: true }
  );

  pgm.dropConstraint(
    'contract_subcontractors',
    'contract_subcontractors_assigned_milestone_id_fkey',
    { ifExists: true }
  );
};

exports.down = async (pgm) => {
  pgm.addConstraint(
    'team_subcontract_proposal_members',
    'team_subcontract_proposal_members_assigned_milestone_id_fkey',
    {
      foreignKeys: {
        columns: 'assigned_milestone_id',
        references: 'job_milestones(job_milestone_id)',
        onDelete: 'SET NULL',
      },
    }
  );

  pgm.addConstraint(
    'contract_subcontractors',
    'contract_subcontractors_assigned_milestone_id_fkey',
    {
      foreignKeys: {
        columns: 'assigned_milestone_id',
        references: 'job_milestones(job_milestone_id)',
        onDelete: 'SET NULL',
      },
    }
  );
};
