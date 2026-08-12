/**
 * Tracks notification delivery separately from provider status and prevents
 * webhook/reconciliation races from creating duplicate user notifications.
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS notification_status varchar(50);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_cashout_status_once
      ON notifications (reference_id, reference_prefix)
      WHERE reference_table = 'cashouts';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_notifications_cashout_status_once;
    ALTER TABLE cashouts DROP COLUMN IF EXISTS notification_status;
  `);
};
