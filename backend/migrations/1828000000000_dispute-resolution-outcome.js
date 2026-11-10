/**
 * Record why a dispute closed, alongside `status = closed`.
 *
 * Migration 149 dropped the old `outcome` column because it only mirrored the status
 * workflow (resolved / sanctioned / dismissed / withdrawn). This column answers a
 * different question: which resolution staff picked when they closed the case
 * (both parties agreed, a party refused to cooperate, a party went inactive, ...).
 * Keys come from backend/lib/DisputeResolutions.js.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns(
    'disputes',
    {
      resolution_outcome: { type: 'varchar(40)' },
    },
    { ifNotExists: true }
  );

  pgm.createIndex('disputes', 'resolution_outcome', {
    name: 'idx_disputes_resolution_outcome',
    ifNotExists: true,
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropIndex('disputes', 'resolution_outcome', {
    name: 'idx_disputes_resolution_outcome',
    ifExists: true,
  });
  pgm.dropColumns('disputes', ['resolution_outcome'], { ifExists: true });
};
