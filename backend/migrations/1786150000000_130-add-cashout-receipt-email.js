/** Stores the optional Xendit payout receipt destination for retries and reconciliation. */
exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS receipt_email varchar(254);`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE cashouts DROP COLUMN IF EXISTS receipt_email;`);
};
