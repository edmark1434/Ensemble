// migrations/108-create-verifications.js

exports.up = (pgm) => {
  // ============================================
  // CREATE VERIFICATIONS TABLE
  // ============================================

  pgm.createTable("verifications", {
    verification_id: {
      type: "uuid",
      primaryKey: true,
      notNull: true,
      default: pgm.func("gen_random_uuid()"),
    },

    account_id: {
      type: "uuid",
      notNull: true,
    },

    verification_session_id: {
      type: "uuid"
    },

    is_verified: {
      type: "boolean",
      notNull: true,
      default: false,
    },

    verified_at: {
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
    "verifications",
    "verifications_account_id_fkey",
    "FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE"
  );

  pgm.addConstraint(
    "verifications",
    "verifications_verification_session_id_fkey",
    "FOREIGN KEY (verification_session_id) REFERENCES account_verification_sessions(verification_session_id) ON DELETE CASCADE"
  );

  // ============================================
  // INDEXES
  // ============================================

  pgm.createIndex("verifications", "account_id", {
    unique: true,
  });

  pgm.createIndex("verifications", "verification_session_id");

  pgm.createIndex("verifications", "is_verified");

  // ============================================
  // UPDATED_AT TRIGGER
  // ============================================

  pgm.createTrigger(
    "verifications",
    "update_verifications_updated_at",
    {
      when: "BEFORE",
      operation: "UPDATE",
      function: "update_modified_column",
      level: "ROW",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropTrigger("verifications", "update_verifications_updated_at", {
    ifExists: true,
  });

  pgm.dropIndex("verifications", "account_id", {
    ifExists: true,
  });

  pgm.dropIndex("verifications", "verification_session_id", {
    ifExists: true,
  });

  pgm.dropIndex("verifications", "is_verified", {
    ifExists: true,
  });

  pgm.dropTable("verifications", {
    ifExists: true,
  });
};