/**
 * Scheduled payouts for dispute money rulings.
 *
 * A settle-escrow or reverse-transaction ruling no longer moves credits to the recipient on
 * the spot. Each recipient gets one `dispute_payouts` row that says how much, from which
 * holding wallet, to which wallet, and when (7 days after the ruling by default, or a date
 * staff pick, or immediately). Until then the credits stay locked in an escrow wallet.
 * The ledger row is written only when the payout is actually paid.
 *
 * status: scheduled → paid | cancelled | failed (failed can be retried back to paid).
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.createTable('dispute_payouts', {
    dispute_payout_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    dispute_id: { type: 'uuid', notNull: true, references: 'disputes', onDelete: 'CASCADE' },
    // escrow_refund / escrow_release come from Settle escrow; reversal from Reverse transaction.
    kind: { type: 'varchar(20)', notNull: true },
    recipient_account_id: { type: 'uuid', references: 'accounts', onDelete: 'SET NULL' },
    // client | freelancer when the dispute is on a contract, otherwise null.
    recipient_role: { type: 'varchar(20)' },
    amount_credits: { type: 'integer', notNull: true },
    // Escrow wallet the credits stay locked in until the payout is released.
    source_wallet_id: { type: 'uuid', notNull: true, references: 'wallets', onDelete: 'RESTRICT' },
    destination_wallet_id: { type: 'uuid', notNull: true, references: 'wallets', onDelete: 'RESTRICT' },
    // Ledger values written when the payout is paid.
    transaction_type: { type: 'credit_transaction_type', notNull: true },
    reference_table: { type: 'varchar' },
    reference_id: { type: 'uuid' },
    reverses_credit_transaction_id: {
      type: 'uuid',
      references: 'credit_transactions',
      onDelete: 'SET NULL',
    },
    // Ledger row that moved the credits into escrow for a reversal (null when they were already there).
    hold_credit_transaction_id: {
      type: 'uuid',
      references: 'credit_transactions',
      onDelete: 'SET NULL',
    },
    status: { type: 'varchar(20)', notNull: true, default: 'scheduled' },
    release_at: { type: 'timestamptz', notNull: true },
    paid_at: { type: 'timestamptz' },
    credit_transaction_id: {
      type: 'uuid',
      references: 'credit_transactions',
      onDelete: 'SET NULL',
    },
    released_by_staff_id: { type: 'uuid', references: 'staff', onDelete: 'SET NULL' },
    cancelled_at: { type: 'timestamptz' },
    cancel_reason: { type: 'text' },
    failure_reason: { type: 'text' },
    attempts: { type: 'integer', notNull: true, default: 0 },
    last_attempt_at: { type: 'timestamptz' },
    created_by_staff_id: { type: 'uuid', references: 'staff', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('dispute_payouts', 'dispute_payouts_kind_check', {
    check: "kind IN ('escrow_refund', 'escrow_release', 'reversal')",
  });
  pgm.addConstraint('dispute_payouts', 'dispute_payouts_status_check', {
    check: "status IN ('scheduled', 'paid', 'cancelled', 'failed')",
  });
  pgm.addConstraint('dispute_payouts', 'dispute_payouts_amount_check', {
    check: 'amount_credits > 0',
  });
  pgm.addConstraint('dispute_payouts', 'dispute_payouts_paid_check', {
    check: "status <> 'paid' OR (paid_at IS NOT NULL AND credit_transaction_id IS NOT NULL)",
  });

  pgm.createIndex('dispute_payouts', 'dispute_id', { name: 'dispute_payouts_dispute_idx' });
  pgm.createIndex('dispute_payouts', 'release_at', {
    name: 'dispute_payouts_due_idx',
    where: "status IN ('scheduled', 'failed')",
  });
  pgm.createIndex('dispute_payouts', 'credit_transaction_id', {
    name: 'dispute_payouts_credit_txn_uidx',
    unique: true,
    where: 'credit_transaction_id IS NOT NULL',
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  // Refuse to drop payouts that still hold someone's credits.
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM dispute_payouts WHERE status IN ('scheduled', 'failed')) THEN
        RAISE EXCEPTION 'dispute_payouts still has scheduled or failed payouts. Release or cancel them before rolling back.';
      END IF;
    END $$;
  `);
  pgm.dropTable('dispute_payouts');
};
