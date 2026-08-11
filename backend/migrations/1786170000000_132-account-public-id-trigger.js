/** Database fallback for account inserts that bypass the Node.js NanoID creation flow. */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_account_public_id()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      alphabet constant text := '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      random_bytes bytea;
      candidate varchar(21);
      index integer;
    BEGIN
      IF NEW.public_id IS NULL OR btrim(NEW.public_id) = '' THEN
        LOOP
          random_bytes := gen_random_bytes(21);
          candidate := '';
          FOR index IN 0..20 LOOP
            candidate := candidate || substr(alphabet, (get_byte(random_bytes, index) % 64) + 1, 1);
          END LOOP;
          EXIT WHEN NOT EXISTS (SELECT 1 FROM accounts WHERE public_id = candidate);
        END LOOP;
        NEW.public_id := candidate;
      END IF;
      RETURN NEW;
    END;
    $function$;

    CREATE TRIGGER trg_accounts_set_public_id
    BEFORE INSERT ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION set_account_public_id();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_accounts_set_public_id ON accounts;
    DROP FUNCTION IF EXISTS set_account_public_id();
  `);
};
