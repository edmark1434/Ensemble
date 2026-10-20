/**
 * Link a contract dispute to its contract and allow only one open dispute per contract.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns('disputes', {
    contract_id: {
      type: 'uuid',
      references: 'contracts',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('disputes', 'contract_id', {
    name: 'disputes_one_open_contract_uidx',
    unique: true,
    where: "contract_id IS NOT NULL AND deleted_at IS NULL AND lower(COALESCE(status, '')) <> 'closed'",
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropIndex('disputes', 'contract_id', {
    name: 'disputes_one_open_contract_uidx',
    ifExists: true,
  });
  pgm.dropColumns('disputes', ['contract_id'], { ifExists: true });
};
