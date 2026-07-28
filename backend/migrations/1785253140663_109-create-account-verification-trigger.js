// migrations/109-create-account-verification-trigger.js

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