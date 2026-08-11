/** Adds recipient data required by Xendit Payout API v3 and retry reconciliation. */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS personal_mobile_number varchar(20);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS street_line_1 varchar(255);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS city varchar(255);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS province_state varchar(255);
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS postal_code varchar(20);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE cashouts DROP COLUMN IF EXISTS postal_code;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS province_state;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS city;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS street_line_1;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS personal_mobile_number;
  `);
};
