/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('disputes', {
    dispute_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    type: { type: 'varchar(50)', notNull: true },
    reason: { type: 'text', notNull: true },
    status: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    resolved_at: { type: 'timestamp without time zone' },
    deleted_at: { type: 'timestamp without time zone' },
    by_account_id: { type: 'uuid', notNull: true },
    for_account_id: { type: 'uuid', notNull: true },
    escalated_by_staff_id: { type: 'uuid' },
    handled_by_staff_id: { type: 'uuid' },
    dispute_number: { type: 'varchar(20)', unique: true },
    title: { type: 'varchar(255)' },
    priority: { type: 'varchar(20)', default: 'high' },
    initiator_account_id: { type: 'uuid' },
    respondent_account_id: { type: 'uuid' },
    related_entity_type: { type: 'varchar(50)' },
    related_entity_id: { type: 'varchar(100)' },
    assigned_staff_id: { type: 'uuid' },
    credit_amount_involved: { type: 'integer', default: 0 },
    opened_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    resolution_notes: { type: 'text' },
    visibility: { type: 'varchar(20)', notNull: true, default: 'pending' },
    approved_at: { type: 'timestamptz' },
    approved_by_staff_id: { type: 'uuid' },
    outcome: { type: 'varchar(50)' },
    sanction_type: { type: 'varchar(50)' },
    sanction_notes: { type: 'text' },
    related_credit_transaction_id: { type: 'uuid' },
  });

  pgm.addConstraint('disputes', 'disputes_by_account_id_fkey', 'FOREIGN KEY (by_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('disputes', 'disputes_for_account_id_fkey', 'FOREIGN KEY (for_account_id) REFERENCES accounts(account_id)');
  pgm.addConstraint('disputes', 'disputes_escalated_by_staff_id_fkey', 'FOREIGN KEY (escalated_by_staff_id) REFERENCES staff(staff_id)');
  pgm.addConstraint('disputes', 'disputes_handled_by_staff_id_fkey', 'FOREIGN KEY (handled_by_staff_id) REFERENCES staff(staff_id)');
  pgm.addConstraint('disputes', 'disputes_approved_by_staff_id_fkey', 'FOREIGN KEY (approved_by_staff_id) REFERENCES staff(staff_id)');
  pgm.addConstraint('disputes', 'disputes_related_credit_transaction_id_fkey', 'FOREIGN KEY (related_credit_transaction_id) REFERENCES credit_transactions(credit_transaction_id)');
  pgm.addConstraint('credit_transactions', 'credit_transactions_related_dispute_id_fkey', 'FOREIGN KEY (related_dispute_id) REFERENCES disputes(dispute_id)');
  pgm.createIndex('disputes', 'visibility', { name: 'idx_disputes_visibility' });
  pgm.createIndex('disputes', 'outcome', { name: 'idx_disputes_outcome' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('disputes', { ifExists: true });
};
