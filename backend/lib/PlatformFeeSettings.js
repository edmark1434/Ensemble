const { getSectionValue } = require('../repositories/AdminSettingsRepositories');

const RECOMMENDED_FEE_SETTINGS = [
  {
    id: 'fee-job',
    label: 'Job transaction',
    percent: 10,
    flatFee: 0,
    appliesTo: 'Completed job contracts',
    paidBy: 'Freelancer',
    reason: 'Commission for successfully completed jobs',
  },
  {
    id: 'fee-gig',
    label: 'Gig transaction',
    percent: 10,
    flatFee: 0,
    appliesTo: 'Gig purchases',
    paidBy: 'Freelancer',
    reason: 'Commission when a client purchases a gig',
  },
  {
    id: 'fee-marketplace',
    label: 'Asset marketplace sale',
    percent: 15,
    flatFee: 0,
    appliesTo: 'Asset sales',
    paidBy: 'Asset creator',
    reason: 'Marketplace commission',
  },
  {
    id: 'fee-credit-purchase',
    label: 'Credit purchase',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Credit top-ups',
    paidBy: 'Buyer',
    reason: 'Keep purchasing credits simple',
  },
  {
    id: 'fee-credit-refund',
    label: 'Credit refund',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Credit refunds',
    paidBy: '—',
    reason: 'Better for user trust',
  },
  {
    id: 'fee-cashout',
    label: 'Withdrawal / cashout',
    percent: 3.5,
    flatFee: 0,
    appliesTo: 'Withdrawals',
    paidBy: 'Seller/Freelancer',
    reason: 'Covers withdrawal and payment processing (recommended 2–5%)',
  },
  {
    id: 'fee-cancellation',
    label: 'Job/Gig cancellation',
    percent: 2.5,
    flatFee: 0,
    appliesTo: 'Cancellations',
    paidBy: 'Depends on situation',
    reason: 'Discourages abuse and cancellations (recommended 0–5%)',
  },
  {
    id: 'fee-dispute',
    label: 'Dispute',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Disputes',
    paidBy: '—',
    reason: 'Do not charge users for requesting protection',
  },
  {
    id: 'fee-forum',
    label: 'Forum',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Forum activity',
    paidBy: '—',
    reason: 'Community feature should remain accessible',
  },
  {
    id: 'fee-job-post',
    label: 'Posting a job',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Job posts',
    paidBy: 'Client',
    reason: 'Encourages clients to post opportunities',
  },
  {
    id: 'fee-gig-create',
    label: 'Creating a gig',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Gig listings',
    paidBy: 'Freelancer',
    reason: 'Encourages freelancers to offer services',
  },
  {
    id: 'fee-asset-upload',
    label: 'Uploading an asset',
    percent: 0,
    flatFee: 0,
    appliesTo: 'Asset listings',
    paidBy: 'Asset creator',
    reason: 'Encourages marketplace inventory',
  },
];

const RECOMMENDED_MARKETPLACE_SETTINGS = {
  listingFeeCredits: 0,
  transactionFeePercent: 15,
  escrowHoldDays: 7,
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

module.exports = {
  RECOMMENDED_FEE_SETTINGS,
  RECOMMENDED_MARKETPLACE_SETTINGS,
  getEconomyFeeSettings,
  getFeeSettingById,
  getMarketplaceTransactionFeePercent,
  calculatePercentFeeAmount,
  calculateCashoutFeePhpCents,
};
