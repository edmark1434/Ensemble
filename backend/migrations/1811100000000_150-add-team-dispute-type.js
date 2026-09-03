const { DISPUTE_TYPES } = require('../lib/DisputeEnums');

function sqlInList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

/** Allow Team as a dispute type / related entity (Title Case enum). */
/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  // Run immediately — pgm.dropConstraint is deferred and would run after UPDATEs.
  await pgm.db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_type_enum`);

  await pgm.db.query(`
    UPDATE disputes
    SET type = 'Team'
    WHERE lower(btrim(COALESCE(type, ''))) = 'team'
       OR (lower(btrim(COALESCE(related_entity_type, ''))) = 'team' AND type = 'General')
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET related_entity_type = 'Team'
    WHERE lower(btrim(COALESCE(related_entity_type, ''))) = 'team'
  `);

  await pgm.db.query(
    `ALTER TABLE disputes ADD CONSTRAINT disputes_type_enum CHECK (type IN (${sqlInList(DISPUTE_TYPES)}))`
  );
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_type_enum`);

  await pgm.db.query(`
    UPDATE disputes
    SET type = 'General'
    WHERE type = 'Team'
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
    ADD CONSTRAINT disputes_type_enum
    CHECK (type IN ('Contract', 'Gig', 'Job', 'Marketplace', 'Feedback', 'Forum', 'Transaction', 'General'))
  `);
};
