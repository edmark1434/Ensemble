/**
 * Match the ER diagram: disputes.type, priority, and status are enums, not varchar.
 * Values come from backend/lib/DisputeEnums.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const {
  DISPUTE_TYPES,
  DISPUTE_STATUSES,
  DISPUTE_PRIORITIES,
} = require('../lib/DisputeEnums');

function sqlEnumLabels(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

function sqlInList(values) {
  return sqlEnumLabels(values);
}

exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE disputes
    SET type = CASE lower(btrim(COALESCE(type, '')))
      WHEN 'contract' THEN 'Contract'
      WHEN 'gig' THEN 'Gig'
      WHEN 'job' THEN 'Job'
      WHEN 'jobs' THEN 'Job'
      WHEN 'marketplace' THEN 'Marketplace'
      WHEN 'asset' THEN 'Marketplace'
      WHEN 'listing' THEN 'Marketplace'
      WHEN 'feedback' THEN 'Feedback'
      WHEN 'forum' THEN 'Forum'
      WHEN 'forums' THEN 'Forum'
      WHEN 'transaction' THEN 'Transaction'
      WHEN 'payment' THEN 'Transaction'
      WHEN 'credit' THEN 'Transaction'
      WHEN 'team' THEN 'Team'
      WHEN 'general' THEN 'General'
      WHEN 'other' THEN 'General'
      ELSE INITCAP(REPLACE(REPLACE(COALESCE(NULLIF(btrim(type), ''), 'General'), '_', ' '), '-', ' '))
    END
  `);
  await pgm.db.query(
    `UPDATE disputes SET type = 'General' WHERE type IS NULL OR type NOT IN (${sqlInList(DISPUTE_TYPES)})`
  );

  await pgm.db.query(`
    UPDATE disputes
    SET priority = CASE lower(btrim(COALESCE(priority, '')))
      WHEN 'low' THEN 'Low'
      WHEN 'medium' THEN 'Medium'
      WHEN 'high' THEN 'High'
      ELSE 'High'
    END
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET status = CASE lower(replace(btrim(COALESCE(status, '')), ' ', '_'))
      WHEN 'pending_review' THEN 'pending_review'
      WHEN 'pending' THEN 'pending_review'
      WHEN 'open' THEN 'open'
      WHEN 'awaiting_response' THEN 'awaiting_response'
      WHEN 'under_review' THEN 'under_review'
      WHEN 'in_review' THEN 'under_review'
      WHEN 'closed' THEN 'closed'
      WHEN 'resolved' THEN 'closed'
      WHEN 'sanctioned' THEN 'closed'
      WHEN 'dismissed' THEN 'closed'
      WHEN 'withdrawn' THEN 'closed'
      ELSE 'pending_review'
    END
  `);

  await pgm.db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_type_enum`);
  await pgm.db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_priority_enum`);
  await pgm.db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_enum`);
  await pgm.db.query(`DROP INDEX IF EXISTS disputes_one_open_contract_uidx`);

  await pgm.db.query(`DROP TYPE IF EXISTS dispute_type`);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_priority`);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_status`);
  await pgm.db.query(`CREATE TYPE dispute_type AS ENUM (${sqlEnumLabels(DISPUTE_TYPES)})`);
  await pgm.db.query(`CREATE TYPE dispute_priority AS ENUM (${sqlEnumLabels(DISPUTE_PRIORITIES)})`);
  await pgm.db.query(`CREATE TYPE dispute_status AS ENUM (${sqlEnumLabels(DISPUTE_STATUSES)})`);

  await pgm.db.query(`ALTER TABLE disputes ALTER COLUMN priority DROP DEFAULT`);
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN type TYPE dispute_type USING type::dispute_type,
      ALTER COLUMN priority TYPE dispute_priority USING priority::dispute_priority,
      ALTER COLUMN status TYPE dispute_status USING status::dispute_status
  `);
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN priority SET DEFAULT 'High'::dispute_priority
  `);

  await pgm.db.query(`
    CREATE UNIQUE INDEX disputes_one_open_contract_uidx
      ON disputes (contract_id)
      WHERE contract_id IS NOT NULL
        AND deleted_at IS NULL
        AND status <> 'closed'::dispute_status
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS disputes_one_open_contract_uidx`);
  await pgm.db.query(`ALTER TABLE disputes ALTER COLUMN priority DROP DEFAULT`);
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN type TYPE varchar(50) USING type::text,
      ALTER COLUMN priority TYPE varchar(20) USING priority::text,
      ALTER COLUMN status TYPE varchar(50) USING status::text
  `);
  await pgm.db.query(`ALTER TABLE disputes ALTER COLUMN priority SET DEFAULT 'High'`);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_type`);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_priority`);
  await pgm.db.query(`DROP TYPE IF EXISTS dispute_status`);

  await pgm.db.query(
    `ALTER TABLE disputes ADD CONSTRAINT disputes_type_enum CHECK (type IN (${sqlInList(DISPUTE_TYPES)}))`
  );
  await pgm.db.query(
    `ALTER TABLE disputes ADD CONSTRAINT disputes_priority_enum CHECK (priority IN (${sqlInList(DISPUTE_PRIORITIES)}))`
  );

  await pgm.db.query(`
    CREATE UNIQUE INDEX disputes_one_open_contract_uidx
      ON disputes (contract_id)
      WHERE contract_id IS NOT NULL
        AND deleted_at IS NULL
        AND lower(COALESCE(status, '')) <> 'closed'
  `);
};
