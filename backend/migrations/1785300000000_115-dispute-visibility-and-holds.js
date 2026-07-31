/**
 * Dispute approval / middleman visibility + linked credit holds.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('credit_transactions', {
    related_dispute_id: { type: 'uuid' },
  });
  pgm.addConstraint(
    'credit_transactions',
    'credit_transactions_related_dispute_id_fkey',
    'FOREIGN KEY (related_dispute_id) REFERENCES disputes(dispute_id)'
  );
  pgm.createIndex('credit_transactions', 'related_dispute_id', {
    name: 'idx_credit_transactions_related_dispute',
  });

  pgm.addColumns('disputes', {
    visibility: { type: 'varchar(20)', notNull: true, default: 'pending' },
    approved_at: { type: 'timestamptz' },
    approved_by_staff_id: { type: 'uuid' },
    outcome: { type: 'varchar(50)' },
    sanction_type: { type: 'varchar(50)' },
    sanction_notes: { type: 'text' },
    related_credit_transaction_id: { type: 'uuid' },
  });

  pgm.addConstraint(
    'disputes',
    'disputes_approved_by_staff_id_fkey',
    'FOREIGN KEY (approved_by_staff_id) REFERENCES staff(staff_id)'
  );
  pgm.addConstraint(
    'disputes',
    'disputes_related_credit_transaction_id_fkey',
    'FOREIGN KEY (related_credit_transaction_id) REFERENCES credit_transactions(credit_transaction_id)'
  );

  // Backfill: existing open/under_review cases were already visible to both parties.
  pgm.sql(`
    UPDATE disputes
    SET visibility = 'parties'
    WHERE LOWER(COALESCE(status, '')) NOT IN ('pending_review')
      AND (approved_at IS NOT NULL OR LOWER(COALESCE(status, '')) IN ('open', 'under_review', 'awaiting_response', 'resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn'))
  `);

  pgm.createIndex('disputes', 'visibility', { name: 'idx_disputes_visibility' });
  pgm.createIndex('disputes', 'outcome', { name: 'idx_disputes_outcome' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('disputes', 'outcome', { name: 'idx_disputes_outcome', ifExists: true });
  pgm.dropIndex('disputes', 'visibility', { name: 'idx_disputes_visibility', ifExists: true });

  pgm.dropConstraint('disputes', 'disputes_related_credit_transaction_id_fkey', { ifExists: true });
  pgm.dropConstraint('disputes', 'disputes_approved_by_staff_id_fkey', { ifExists: true });
  pgm.dropColumns('disputes', [
    'visibility',
    'approved_at',
    'approved_by_staff_id',
    'outcome',
    'sanction_type',
    'sanction_notes',
    'related_credit_transaction_id',
  ], { ifExists: true });

  pgm.dropIndex('credit_transactions', 'related_dispute_id', {
    name: 'idx_credit_transactions_related_dispute',
    ifExists: true,
  });
  pgm.dropConstraint('credit_transactions', 'credit_transactions_related_dispute_id_fkey', {
    ifExists: true,
  });
  pgm.dropColumns('credit_transactions', ['related_dispute_id'], { ifExists: true });
};
