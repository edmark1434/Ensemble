/** Rewrite dispute titles to "{Disputee} v {Disputer} {Type} Dispute". */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE disputes d
    SET title = TRIM(BOTH FROM
      COALESCE(NULLIF(TRIM(ra.display_name), ''), NULLIF(TRIM(ru.first_name || ' ' || ru.last_name), ''), 'Disputee')
    ) || ' v ' || TRIM(BOTH FROM
      COALESCE(NULLIF(TRIM(ia.display_name), ''), NULLIF(TRIM(iu.first_name || ' ' || iu.last_name), ''), 'Disputer')
    ) || ' ' || COALESCE(NULLIF(btrim(d.type), ''), 'General') || ' Dispute'
    FROM accounts ia
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    CROSS JOIN accounts ra
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    WHERE ia.account_id = d.by_account_id
      AND ra.account_id = d.for_account_id
  `);

  await pgm.db.query(`
    UPDATE disputes
    SET title = 'Disputee v Disputer General Dispute'
    WHERE title IS NULL OR btrim(title) = ''
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN title SET DEFAULT 'Disputee v Disputer General Dispute'
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE disputes
      ALTER COLUMN title SET DEFAULT 'Disputee v Disputer Transaction Dispute'
  `);
};
