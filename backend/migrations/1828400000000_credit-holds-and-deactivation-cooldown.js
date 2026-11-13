/**
 * Credit holds and the deactivation cooldown.
 *
 * wallets.frozen_*: a staff credit freeze now records why it was placed, by whom, when, and
 * (optionally) when it ends, so the member can be told how and when they get the credits
 * back. frozen_until NULL means "until staff review it". The one-minute standing job
 * releases holds whose frozen_until has passed.
 *
 * accounts.deactivation_available_at: set when a member reactivates, so they cannot turn the
 * account off again until the cooldown ends (stops hide/unhide toggling).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumn('wallets', {
    frozen_at: { type: 'timestamptz' },
    frozen_until: { type: 'timestamptz' },
    frozen_reason: { type: 'text' },
    frozen_by_staff_id: {
      type: 'uuid',
      references: 'staff(staff_id)',
      onDelete: 'SET NULL',
    },
  });
  // Existing holds have no recorded start; treat them as starting now so the member sees one.
  pgm.sql(`
    UPDATE wallets
    SET frozen_at = NOW()
    WHERE frozen_balance_credits > 0 AND frozen_at IS NULL
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS wallets_frozen_until_due_idx
    ON wallets (frozen_until)
    WHERE frozen_balance_credits > 0 AND frozen_until IS NOT NULL
  `);

  pgm.addColumn('accounts', {
    deactivation_available_at: { type: 'timestamptz' },
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropColumn('accounts', 'deactivation_available_at', { ifExists: true });
  pgm.sql('DROP INDEX IF EXISTS wallets_frozen_until_due_idx');
  pgm.dropColumn('wallets', ['frozen_by_staff_id', 'frozen_reason', 'frozen_until', 'frozen_at'], {
    ifExists: true,
  });
};
