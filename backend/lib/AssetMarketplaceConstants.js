const MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT = 8;

function calculateAssetTransactionFee(priceCredits) {
  const price = Number(priceCredits);
  if (!Number.isSafeInteger(price) || price < 0) {
    throw new TypeError('Asset price must be a non-negative integer');
  }
  if (price === 0 || MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT === 0) return 0;
  const fee = Math.ceil((price * MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT) / 100);
  return Math.min(price, fee);
}

module.exports = {
  MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
};
