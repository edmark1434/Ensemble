/**
 * Migration: 1824700000000_add-team-roster-to-proposals.js
 * Adds proposed_by_account_id and included_member_account_ids to proposals
 * so team proposals record the proposing Team Leader and the selected team members.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('proposals', {
    proposed_by_account_id: {
      type: 'uuid',
      notNull: false,
      references: 'accounts(account_id)',
      onDelete: 'SET NULL',
    },
    included_member_account_ids: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('proposals', ['proposed_by_account_id', 'included_member_account_ids']);
};
