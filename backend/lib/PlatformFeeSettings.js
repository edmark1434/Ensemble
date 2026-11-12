const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { DEFAULT_SETTINGS } = require('./PlatformConfiguration');

const RECOMMENDED_FEE_SETTINGS = structuredClone(DEFAULT_SETTINGS.economy.feeSettings);

const RECOMMENDED_MARKETPLACE_SETTINGS = {
  listingFeeCredits: 0,
  transactionFeePercent: 15,
  minPayoutCredits: 500,
  refundWindowDays: 14,
};

function findFeeSetting(feeSettings, id) {
  return (feeSettings || []).find((item) => item.id === id) || null;
}

async function getEconomyFeeSettings() {
  const economy = await getSectionValue('economy');
  return Array.isArray(economy?.feeSettings) ? economy.feeSettings : RECOMMENDED_FEE_SETTINGS;
}

async function getFeeSettingById(id) {
  const feeSettings = await getEconomyFeeSettings();
  return findFeeSetting(feeSettings, id) || findFeeSetting(RECOMMENDED_FEE_SETTINGS, id);
}

/** Flat credit fee from a feeSettings row (used for posting/listing charges). */
async function getFlatFeeCredits(feeId, fallback = 0) {
  const fee = await getFeeSettingById(feeId);
  const flat = Number(fee?.flatFee);
  if (Number.isFinite(flat) && flat >= 0) return Math.round(flat);
  const safeFallback = Number(fallback);
  return Number.isFinite(safeFallback) && safeFallback >= 0 ? Math.round(safeFallback) : 0;
}

async function getJobPostFeeCredits() {
  return getFlatFeeCredits('fee-job-post', 50);
}

async function getGigCreateFeeCredits() {
  return getFlatFeeCredits('fee-gig-create', 50);
}

async function getMarketplaceTransactionFeePercent() {
  const economy = await getSectionValue('economy');
  const configured = Number(economy?.marketplaceSettings?.transactionFeePercent);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  const marketplaceFee = findFeeSetting(economy?.feeSettings, 'fee-marketplace');
  if (marketplaceFee && Number.isFinite(Number(marketplaceFee.percent))) {
    return Number(marketplaceFee.percent);
  }
  return RECOMMENDED_MARKETPLACE_SETTINGS.transactionFeePercent;
}

function calculatePercentFeeAmount(baseAmount, percent, flatFee = 0) {
  const normalizedBase = Number(baseAmount);
  const normalizedPercent = Number(percent);
  const normalizedFlat = Number(flatFee) || 0;
  if (!Number.isFinite(normalizedBase) || normalizedBase <= 0) return 0;
  if (!Number.isFinite(normalizedPercent) || normalizedPercent <= 0) {
    return Math.max(0, Math.round(normalizedFlat));
  }
  const percentFee = Math.ceil((normalizedBase * normalizedPercent) / 100);
  return Math.min(normalizedBase, percentFee + Math.max(0, Math.round(normalizedFlat)));
}

async function calculateCashoutFeePhpCents(amountCredits, phpCentsPerCredit) {
  const envFlatFee = Math.max(0, Number.parseInt(process.env.CASHOUT_FEE_PHP_CENTS || '0', 10) || 0);
  const cashoutFee = await getFeeSettingById('fee-cashout');
  const percent = Number(cashoutFee?.percent);
  const flatPhpCents = Math.max(0, Number.parseInt(process.env.CASHOUT_FEE_FLAT_PHP_CENTS || '0', 10) || 0);
  const grossCents = Number(amountCredits) * Number(phpCentsPerCredit);
  if (!Number.isFinite(grossCents) || grossCents <= 0) return 0;
  if (Number.isFinite(percent) && percent > 0) {
    return calculatePercentFeeAmount(grossCents, percent, flatPhpCents);
  }
  return envFlatFee;
}

async function getMarketplaceListingFeeCredits() {
  const economy = await getSectionValue('economy');
  const configured = Number(economy?.marketplaceSettings?.listingFeeCredits);
  if (Number.isFinite(configured) && configured > 0) return configured;
  const assetUploadFlat = await getFlatFeeCredits('fee-asset-upload', 0);
  if (assetUploadFlat > 0) return assetUploadFlat;
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return RECOMMENDED_MARKETPLACE_SETTINGS.listingFeeCredits;
}

async function getMarketplaceRefundWindowDays() {
  const economy = await getSectionValue('economy');
  const configured = Number(economy?.marketplaceSettings?.refundWindowDays);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return RECOMMENDED_MARKETPLACE_SETTINGS.refundWindowDays;
}

/**
 * PHP pesos per 1 platform credit.
 * Prefer economy.creditValuePhp; fall back to CASHOUT_PHP_CENTS_PER_CREDIT env, then default 1.
 */
async function getCreditValuePhp() {
  try {
    const economy = await getSectionValue('economy');
    const configured = Number(economy?.creditValuePhp);
    if (Number.isFinite(configured) && configured > 0) return configured;
  } catch (_err) {
    /* use fallbacks */
  }
  const envCents = Number.parseInt(process.env.CASHOUT_PHP_CENTS_PER_CREDIT || '', 10);
  if (Number.isFinite(envCents) && envCents > 0) return envCents / 100;
  return Number(DEFAULT_SETTINGS.economy.creditValuePhp) || 1;
}

/** Whole PHP cents per 1 platform credit (for cashout / payout math). */
async function getPhpCentsPerCredit() {
  return Math.max(1, Math.round((await getCreditValuePhp()) * 100));
}

module.exports = {
  RECOMMENDED_FEE_SETTINGS,
  RECOMMENDED_MARKETPLACE_SETTINGS,
  getEconomyFeeSettings,
  getFeeSettingById,
  getFlatFeeCredits,
  getJobPostFeeCredits,
  getGigCreateFeeCredits,
  getMarketplaceTransactionFeePercent,
  getMarketplaceListingFeeCredits,
  getMarketplaceRefundWindowDays,
  getCreditValuePhp,
  getPhpCentsPerCredit,
  calculatePercentFeeAmount,
  calculateCashoutFeePhpCents,
};
