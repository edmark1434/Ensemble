const {
  DISPUTE_TYPES,
  normalizeDisputeType,
  normalizeDisputePriority,
  buildDefaultDisputeTitle,
} = require('../lib/DisputeEnums');

function sqlInList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
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
      WHEN 'general' THEN 'General'
      WHEN 'other' THEN 'General'
      ELSE INITCAP(REPLACE(REPLACE(COALESCE(NULLIF(btrim(type), ''), 'General'), '_', ' '), '-', ' '))
    END
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET related_entity_type = CASE lower(btrim(COALESCE(related_entity_type, '')))
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
      WHEN 'general' THEN 'General'
      WHEN '' THEN NULL
      ELSE INITCAP(REPLACE(REPLACE(related_entity_type, '_', ' '), '-', ' '))
    END
  `);

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
    UPDATE disputes d
    SET title = TRIM(BOTH FROM
      COALESCE(NULLIF(TRIM(ra.display_name), ''), NULLIF(TRIM(ru.first_name || ' ' || ru.last_name), ''), 'Disputee')
    ) || ' v ' || TRIM(BOTH FROM
      COALESCE(NULLIF(TRIM(ia.display_name), ''), NULLIF(TRIM(iu.first_name || ' ' || iu.last_name), ''), 'Disputer')
    ) || ' Transaction Dispute'
    FROM accounts ia
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    CROSS JOIN accounts ra
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    WHERE ia.account_id = COALESCE(d.initiator_account_id, d.by_account_id)
      AND ra.account_id = COALESCE(d.respondent_account_id, d.for_account_id)
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET title = 'Disputee v Disputer Transaction Dispute'
    WHERE title IS NULL OR btrim(title) = ''
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN title SET DEFAULT 'Disputee v Disputer Transaction Dispute',
      ALTER COLUMN priority SET DEFAULT 'High'
  `);

  await pgm.db.query(
    `UPDATE disputes SET type = 'General' WHERE type IS NULL OR type NOT IN (${sqlInList(DISPUTE_TYPES)})`
  );

  pgm.addConstraint(
    'disputes',
    'disputes_type_enum',
    `CHECK (type IN (${sqlInList(DISPUTE_TYPES)}))`
  );
  pgm.addConstraint(
    'disputes',
    'disputes_priority_enum',
    `CHECK (priority IN ('Low', 'Medium', 'High'))`
  );
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  pgm.dropConstraint('disputes', 'disputes_type_enum', { ifExists: true });
  pgm.dropConstraint('disputes', 'disputes_priority_enum', { ifExists: true });

  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN title DROP DEFAULT,
      ALTER COLUMN priority SET DEFAULT 'high'
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET
      type = lower(replace(type, ' ', '_')),
      related_entity_type = CASE
        WHEN related_entity_type IS NULL THEN NULL
        ELSE lower(replace(related_entity_type, ' ', '_'))
      END,
      priority = lower(priority)
  `);
};
