/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('contract_cancellation_requests', {
    request_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()')
    },
    contract_id: {
      type: 'uuid',
      notNull: true,
      references: 'contracts(contract_id)',
      onDelete: 'CASCADE'
    },
    initiator_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts(account_id)'
    },
    recipient_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts(account_id)'
    },
    initiator_role: {
      type: 'varchar(20)',
      notNull: true,
      check: "initiator_role IN ('client', 'freelancer')"
    },
    reason: {
      type: 'varchar(150)',
      notNull: true
    },
    message: {
      type: 'text',
      notNull: true
    },
    decline_reason: {
      type: 'text'
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'accepted', 'declined', 'withdrawn', 'auto_approved')"
    },
    auto_cancel_at: {
      type: 'timestamp without time zone',
      notNull: true
    },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    responded_at: {
      type: 'timestamp without time zone'
    }
  });

  pgm.createIndex('contract_cancellation_requests', 'contract_id', {
    name: 'idx_cancellation_requests_contract_id'
  });
  pgm.createIndex('contract_cancellation_requests', ['status', 'auto_cancel_at'], {
    name: 'idx_cancellation_requests_pending_auto_cancel'
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('contract_cancellation_requests', { ifExists: true });
};
