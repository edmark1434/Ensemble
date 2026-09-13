const { calculatePercentFeeAmount } = require('./PlatformFeeSettings');

const DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT = 15;

function calculateAssetTransactionFee(priceCredits, feePercent = DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT) {
  return calculatePercentFeeAmount(priceCredits, feePercent, 0);
}

module.exports = {
  DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT: DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
};
