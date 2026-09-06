/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ============================================
  // CREATE ACCOUNT VERIFICATION SESSIONS TABLE
  // ============================================
  pgm.createTable("verification_sessions", {
    verification_session_id: {
      type: "uuid",
      primaryKey: true,
      notNull: true,
      default: pgm.func("gen_random_uuid()"),
    },

    account_id: {
      type: "uuid",
      notNull: true,
    },

    didit_session_id: {
      type: "varchar(255)",
      notNull: true,
    },

    verification_url: {
      type: "text",
      notNull: true,
    },

    // Status received from Didit
    kyc_status: {
      type: "varchar(50)",
      notNull: true,
      default: "Not Started",
    },

    // Internal review status
    verification_status: {
      type: "varchar(50)",
      notNull: true,
      default: "Pending",
    },

    verified_by_account_id: {
      type: "uuid",
    },

    expires_at: {
      type: "timestamp without time zone",
    },

    created_at: {
      type: "timestamp without time zone",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },

    updated_at: {
      type: "timestamp without time zone",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // ============================================
  // FOREIGN KEYS
  // ============================================

  pgm.addConstraint(
    "verification_sessions",
    "verification_sessions_account_id_fkey",
    "FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE"
  );

  pgm.addConstraint(
    "verification_sessions",
    "verification_sessions_verified_by_account_id_fkey",
    "FOREIGN KEY (verified_by_account_id) REFERENCES accounts(account_id) ON DELETE SET NULL"
  );

  // ============================================
  // INDEXES
  // ============================================

  pgm.createIndex("verification_sessions", "account_id");

  pgm.createIndex(
    "verification_sessions",
    "didit_session_id",
    {
      unique: true,
    }
  );

  pgm.createIndex(
    "verification_sessions",
    "kyc_status"
  );

  pgm.createIndex(
    "verification_sessions",
    "verification_status"
  );

  pgm.createIndex(
    "verification_sessions",
    "verified_by_account_id"
  );

  pgm.createIndex(
    "verification_sessions",
    "expires_at"
  );

  // ============================================
  // UPDATED_AT TRIGGER
  // ============================================

  pgm.createTrigger(
    "verification_sessions",
    "update_verification_session_updated_at",
    {
      when: "BEFORE",
      operation: "UPDATE",
      function: "update_modified_column",
      level: "ROW",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropTrigger(
    "verification_sessions",
    "update_verification_session_updated_at",
    { ifExists: true }
  );

  pgm.dropIndex("verification_sessions", "account_id", {
    ifExists: true,
  });

  pgm.dropIndex(
    "verification_sessions",
    "didit_session_id",
    {
      ifExists: true,
    }
  );

  pgm.dropIndex(
    "verification_sessions",
    "kyc_status",
    {
      ifExists: true,
    }
  );

  pgm.dropIndex(
    "verification_sessions",
    "verification_status",
    {
      ifExists: true,
    }
  );

  pgm.dropIndex(
    "verification_sessions",
    "verified_by_account_id",
    {
      ifExists: true,
    }
  );

  pgm.dropIndex(
    "verification_sessions",
    "expires_at",
    {
      ifExists: true,
    }
  );

  pgm.dropTable("verification_sessions", {
    ifExists: true,
  });
};