/** Drop disputes.sanction_notes — keep resolution_notes only. */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE disputes
    SET resolution_notes = CASE
      WHEN sanction_notes IS NULL OR btrim(sanction_notes) = '' THEN resolution_notes
      WHEN resolution_notes IS NULL OR btrim(resolution_notes) = '' THEN sanction_notes
      WHEN position(sanction_notes IN resolution_notes) > 0 THEN resolution_notes
      ELSE resolution_notes || E'\\n\\nSanction: ' || sanction_notes
    END
    WHERE sanction_notes IS NOT NULL AND btrim(sanction_notes) <> ''
  `);

  await pgm.db.query(`
    ALTER TABLE disputes DROP COLUMN IF EXISTS sanction_notes
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS sanction_notes TEXT
  `);
};
