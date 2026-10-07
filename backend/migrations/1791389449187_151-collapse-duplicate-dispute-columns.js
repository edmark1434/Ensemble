/** Collapse duplicate dispute columns onto by/for/type/handled_by. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE disputes
    SET by_account_id = COALESCE(by_account_id, initiator_account_id)
    WHERE by_account_id IS NULL AND initiator_account_id IS NOT NULL
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET for_account_id = COALESCE(for_account_id, respondent_account_id)
    WHERE for_account_id IS NULL AND respondent_account_id IS NOT NULL
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET handled_by_staff_id = COALESCE(handled_by_staff_id, assigned_staff_id)
    WHERE handled_by_staff_id IS NULL AND assigned_staff_id IS NOT NULL
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET type = CASE lower(btrim(COALESCE(NULLIF(btrim(type), ''), related_entity_type, 'General')))
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
      ELSE INITCAP(REPLACE(REPLACE(COALESCE(NULLIF(btrim(type), ''), related_entity_type, 'General'), '_', ' '), '-', ' '))
    END
    WHERE type IS NULL
       OR btrim(type) = ''
       OR (
         related_entity_type IS NOT NULL
         AND lower(btrim(type)) IN ('general', 'other')
         AND lower(btrim(related_entity_type)) <> 'general'
       )
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS initiator_account_id,
      DROP COLUMN IF EXISTS respondent_account_id,
      DROP COLUMN IF EXISTS related_entity_type,
      DROP COLUMN IF EXISTS related_entity_id,
      DROP COLUMN IF EXISTS assigned_staff_id
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS initiator_account_id UUID,
      ADD COLUMN IF NOT EXISTS respondent_account_id UUID,
      ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS related_entity_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS assigned_staff_id UUID
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET
      initiator_account_id = by_account_id,
      respondent_account_id = for_account_id,
      related_entity_type = type,
      assigned_staff_id = handled_by_staff_id
  `);
};
