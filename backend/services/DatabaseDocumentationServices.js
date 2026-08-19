const fs = require('fs/promises');
const path = require('path');
const {
  getPublicPlatformSettings,
  getPlans,
} = require('../repositories/RagDatabaseSourceRepositories');

const GENERATED_DIRECTORY = path.resolve(__dirname, '../data/generated');

function present(value, fallback = 'Not configured') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function moneyFromCents(value) {
  return `PHP ${(number(value) / 100).toFixed(2)}`;
}

function renderPlatformSettings(rows) {
  const settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value || {}]));
  const platform = settings.platform || {};
  const economy = settings.economy || {};
  const packages = Array.isArray(economy.creditPackages) ? economy.creditPackages : [];
  const fees = Array.isArray(economy.feeSettings) ? economy.feeSettings : [];
  const marketplace = economy.marketplaceSettings || {};

  const packageLines = packages
    .filter((item) => item?.active === true)
    .map((item) => `- ${present(item.name, 'Unnamed package')}: ${number(item.credits)} credits for PHP ${number(item.pricePhp).toFixed(2)}`);
  const feeLines = fees.map((item) => {
    const percent = number(item?.percent);
    const flatFee = number(item?.flatFee);
    return `- ${present(item?.label, 'Platform fee')}: ${percent}% plus ${flatFee} credits; applies to ${present(item?.appliesTo, 'configured transactions')}.`;
  });

  return `# Current Ensemble Platform Settings

This document is generated from the current public platform configuration in PostgreSQL.

## Platform information

- Platform name: ${present(platform.siteName, 'Ensemble')}
- Tagline: ${present(platform.tagline, '')}
- New-user registration enabled: ${yesNo(platform.registrationEnabled)}
- Maximum upload size: ${number(platform.maxUploadMb)} MB
- Support email: ${present(platform.supportEmail)}

## Active credit packages

${packageLines.length ? packageLines.join('\n') : 'No active credit packages are currently configured.'}

## Platform fees

${feeLines.length ? feeLines.join('\n') : 'No public platform fees are currently configured.'}

## Marketplace configuration

- Listing fee: ${number(marketplace.listingFeeCredits)} credits
- Transaction fee: ${number(marketplace.transactionFeePercent)}%
- Escrow holding period: ${number(marketplace.escrowHoldDays)} days
- Minimum payout: ${number(marketplace.minPayoutCredits)} credits
- Refund window: ${number(marketplace.refundWindowDays)} days
`;
}

function renderPlans(plans) {
  const summary = plans.map((plan) =>
    `- ${present(plan.name, 'Unnamed plan')}: ${moneyFromCents(plan.amount_php_cents)} per ${present(plan.billing_period).toLowerCase()}, with a ${number(plan.days_of_trials)}-day trial.`
  );
  const sections = plans.map((plan) => `## ${present(plan.name, 'Unnamed plan')}

${present(plan.description, 'No description is currently available.')}

- Price: ${moneyFromCents(plan.amount_php_cents)}
- Billing period: ${present(plan.billing_period)}
- Trial period: ${number(plan.days_of_trials)} days`);

  return `# Current Ensemble Plans

This document is generated from active records in the PostgreSQL plans table.

## Available subscription plans

${summary.length ? summary.join('\n') : 'No subscription plans are currently available.'}

${sections.length ? sections.join('\n\n') : 'No plans are currently available.'}
`;
}

async function writeGeneratedFile(filename, content) {
  await fs.mkdir(GENERATED_DIRECTORY, { recursive: true });
  const target = path.join(GENERATED_DIRECTORY, filename);
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, content.trimEnd() + '\n', 'utf8');
  await fs.rename(temporary, target);
}

async function generateDatabaseDocumentation() {
  const [settings, plans] = await Promise.all([
    getPublicPlatformSettings(),
    getPlans(),
  ]);
  await Promise.all([
    writeGeneratedFile('platform-settings.md', renderPlatformSettings(settings)),
    writeGeneratedFile('plans.md', renderPlans(plans)),
  ]);
  return { settingsSections: settings.length, plans: plans.length };
}

module.exports = {
  renderPlatformSettings,
  renderPlans,
  generateDatabaseDocumentation,
};
