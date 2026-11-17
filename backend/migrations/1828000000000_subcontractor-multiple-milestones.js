/**
 * Migration: 1828000000000_subcontractor-multiple-milestones.js
 * Adds assigned_milestone_ids (uuid[]) to team_subcontract_proposal_members and contract_subcontractors
 * so a subcontractor can be assigned to multiple contract milestones.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.addColumns('team_subcontract_proposal_members', {
    assigned_milestone_ids: {
      type: 'uuid[]',
      notNull: true,
      default: pgm.func("'{}'::uuid[]"),
    },
  });

  pgm.addColumns('contract_subcontractors', {
    assigned_milestone_ids: {
      type: 'uuid[]',
      notNull: true,
      default: pgm.func("'{}'::uuid[]"),
    },
  });

  pgm.sql(`
    UPDATE team_subcontract_proposal_members
       SET assigned_milestone_ids = ARRAY[assigned_milestone_id]
     WHERE assigned_milestone_id IS NOT NULL
       AND cardinality(assigned_milestone_ids) = 0;

    UPDATE contract_subcontractors
       SET assigned_milestone_ids = ARRAY[assigned_milestone_id]
     WHERE assigned_milestone_id IS NOT NULL
       AND cardinality(assigned_milestone_ids) = 0;
  `);
};

exports.down = async (pgm) => {
  pgm.dropColumns('contract_subcontractors', ['assigned_milestone_ids'], { ifExists: true });
  pgm.dropColumns('team_subcontract_proposal_members', ['assigned_milestone_ids'], { ifExists: true });
};
