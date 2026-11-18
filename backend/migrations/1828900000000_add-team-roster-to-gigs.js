/**
 * Migration: 1828900000000_add-team-roster-to-gigs.js
 * Adds included_member_account_ids to gigs so team gig posts record the selected team members.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns(
    'gigs',
    {
      included_member_account_ids: {
        type: 'jsonb',
        notNull: true,
        default: '[]',
      },
    },
    { ifNotExists: true }
  );
};

exports.down = (pgm) => {
  pgm.dropColumns('gigs', ['included_member_account_ids'], { ifExists: true });
};
