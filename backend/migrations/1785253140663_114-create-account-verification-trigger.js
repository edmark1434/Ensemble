/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ============================================
  // FUNCTION
  // ============================================

  pgm.createFunction(
    "create_default_verification",
    [],
    {
      returns: "trigger",
      language: "plpgsql",
    },
    `
    BEGIN
      INSERT INTO verifications (
        account_id,
        is_verified
      )
      VALUES (
        NEW.account_id,
        FALSE
      );

      RETURN NEW;
    END;
    `
  );

  // ============================================
  // TRIGGER
  // ============================================

  pgm.createTrigger(
    "accounts",
    "create_default_verification_trigger",
    {
      when: "AFTER",
      operation: "INSERT",
      level: "ROW",
      function: "create_default_verification",
    }
  );
};

exports.down = (pgm) => {
  pgm.dropTrigger(
    "accounts",
    "create_default_verification_trigger",
    {
      ifExists: true,
    }
  );

  pgm.dropFunction(
    "create_default_verification",
    [],
    {
      ifExists: true,
    }
  );
};