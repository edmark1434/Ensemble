const { nanoid } = require('nanoid');

const TABLES = [
  { table: 'accounts', primaryKey: 'account_id', constraint: 'accounts_public_id_key' },
  { table: 'projects', primaryKey: 'project_id', constraint: 'projects_public_id_key' },
  { table: 'media_assets', primaryKey: 'media_asset_id', constraint: 'media_assets_public_id_key' },
];

async function assignUniquePublicId(db, table, primaryKey, id) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await db.query(
      `UPDATE ${table} SET public_id = $1 WHERE ${primaryKey} = $2 AND NOT EXISTS (SELECT 1 FROM ${table} WHERE public_id = $1) RETURNING ${primaryKey}`,
      [nanoid(), id]
    );
    if (result.rowCount === 1) return;
  }
  throw new Error(`Unable to generate a unique public_id for ${table}.${primaryKey}=${id}`);
}

exports.up = async (pgm) => {
  for (const { table, primaryKey, constraint } of TABLES) {
    await pgm.db.query(`ALTER TABLE ${table} ADD COLUMN public_id varchar(21)`);
    const existing = await pgm.db.query(`SELECT ${primaryKey} FROM ${table} WHERE public_id IS NULL`);
    for (const row of existing.rows) await assignUniquePublicId(pgm.db, table, primaryKey, row[primaryKey]);
    await pgm.db.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} UNIQUE (public_id)`);
    await pgm.db.query(`ALTER TABLE ${table} ALTER COLUMN public_id SET NOT NULL`);
  }
};

exports.down = async (pgm) => {
  for (const { table, constraint } of [...TABLES].reverse()) {
    await pgm.db.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`);
    await pgm.db.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS public_id`);
  }
};
