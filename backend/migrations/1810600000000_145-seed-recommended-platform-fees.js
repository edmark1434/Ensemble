const {
  RECOMMENDED_FEE_SETTINGS,
  RECOMMENDED_MARKETPLACE_SETTINGS,
} = require('../lib/PlatformFeeSettings');

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  const patch = JSON.stringify({
    feeSettings: RECOMMENDED_FEE_SETTINGS,
    marketplaceSettings: RECOMMENDED_MARKETPLACE_SETTINGS,
  });

  await pgm.db.query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
     VALUES ('economy', $1::jsonb, NOW())
     ON CONFLICT (setting_key) DO UPDATE
     SET setting_value = platform_settings.setting_value || $1::jsonb,
         updated_at = NOW()`,
    [patch]
  );
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  const patch = JSON.stringify({
    feeSettings: [
      { id: 'fee-marketplace', label: 'Marketplace transaction fee', percent: 8, flatFee: 0, appliesTo: 'Asset sales' },
      { id: 'fee-job', label: 'Jobs & gigs platform fee', percent: 12, flatFee: 50, appliesTo: 'Job contracts' },
      { id: 'fee-payout', label: 'Payout processing fee', percent: 2.5, flatFee: 25, appliesTo: 'Withdrawals' },
      { id: 'fee-listing', label: 'Asset listing fee', percent: 0, flatFee: 100, appliesTo: 'New listings' },
    ],
    marketplaceSettings: {
      listingFeeCredits: 100,
      transactionFeePercent: 8,
      escrowHoldDays: 7,
      minPayoutCredits: 500,
      refundWindowDays: 14,
    },
  });

  await pgm.db.query(
    `UPDATE platform_settings
     SET setting_value = setting_value || $1::jsonb,
         updated_at = NOW()
     WHERE setting_key = 'economy'`,
    [patch]
  );
};
