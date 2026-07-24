// migrations/101-create-account-verification-sessions.js

exports.up = (pgm) => {
  // ============================================
  // CREATE ACCOUNT VERIFICATION SESSIONS TABLE
  // ============================================
  pgm.createTable('account_verification_sessions', {
    verification_session_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()')
    },
    user_id: {
      type: 'uuid',
      notNull: true
    },
    didit_session_id: {
      type: 'varchar(255)',
      notNull: true
    },
    verification_url: {
      type: 'text',
      notNull: true
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending'
    },
    expires_at: {
      type: 'timestamp without time zone'
    },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // ============================================
  // ADD FOREIGN KEY CONSTRAINT
  // ============================================
  pgm.addConstraint(
    'account_verification_sessions',
    'account_verification_sessions_user_id_fkey',
    'FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE'
  );

  // ============================================
  // ADD INDEXES FOR PERFORMANCE
  // ============================================
  pgm.createIndex('account_verification_sessions', 'user_id');
  pgm.createIndex('account_verification_sessions', 'didit_session_id', { unique: true });
  pgm.createIndex('account_verification_sessions', 'status');
  pgm.createIndex('account_verification_sessions', 'expires_at');

  // ============================================
  // ADD TRIGGER FOR UPDATED_AT
  // ============================================
  pgm.createTrigger('account_verification_sessions', 'update_verification_session_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_modified_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  // ============================================
  // DROP TRIGGER
  // ============================================
  pgm.dropTrigger('account_verification_sessions', 'update_verification_session_updated_at', { ifExists: true });

  // ============================================
  // DROP INDEXES
  // ============================================
  pgm.dropIndex('account_verification_sessions', 'user_id', { ifExists: true });
  pgm.dropIndex('account_verification_sessions', 'didit_session_id', { ifExists: true });
  pgm.dropIndex('account_verification_sessions', 'status', { ifExists: true });
  pgm.dropIndex('account_verification_sessions', 'expires_at', { ifExists: true });

  // ============================================
  // DROP TABLE
  // ============================================
  pgm.dropTable('account_verification_sessions', { ifExists: true });
};