const TABLES = [
  { table: 'accounts', constraint: 'accounts_public_id_key' },
  { table: 'projects', constraint: 'projects_public_id_key' },
  { table: 'media_assets', constraint: 'media_assets_public_id_key' },
];

exports.up = async (pgm) => {
  await pgm.db.query('DROP TRIGGER IF EXISTS trg_accounts_set_public_id ON accounts');
  await pgm.db.query('DROP FUNCTION IF EXISTS set_account_public_id()');

  for (const { table, constraint } of TABLES) {
    await pgm.db.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`);
    await pgm.db.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS public_id`);
  }
};

exports.down = async (pgm) => {
  for (const { table, constraint } of TABLES) {
    await pgm.db.query(`ALTER TABLE ${table} ADD COLUMN public_id varchar(21)`);
    await pgm.db.query(`
      UPDATE ${table}
      SET public_id = substring(encode(gen_random_bytes(16), 'hex') FROM 1 FOR 21)
      WHERE public_id IS NULL
    `);
    await pgm.db.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} UNIQUE (public_id)`);
    await pgm.db.query(`ALTER TABLE ${table} ALTER COLUMN public_id SET NOT NULL`);
  }

  await pgm.db.query(`
    CREATE OR REPLACE FUNCTION set_account_public_id()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      candidate varchar(21);
    BEGIN
      IF NEW.public_id IS NULL OR btrim(NEW.public_id) = '' THEN
        LOOP
          candidate := substring(encode(gen_random_bytes(16), 'hex') FROM 1 FOR 21);
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
