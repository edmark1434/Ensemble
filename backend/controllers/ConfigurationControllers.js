const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { DEFAULT_SETTINGS } = require('../lib/PlatformConfiguration');
const {
  getJobPostFeeCredits,
  getGigCreateFeeCredits,
  getMarketplaceListingFeeCredits,
} = require('../lib/PlatformFeeSettings');

async function getPublicConfigurationController(req, res) {
  try {
    const [platform, economy, jobPostFeeCredits, gigCreateFeeCredits, listingFeeCredits] = await Promise.all([
      getSectionValue('platform').catch(() => DEFAULT_SETTINGS.platform),
      getSectionValue('economy').catch(() => DEFAULT_SETTINGS.economy),
      getJobPostFeeCredits().catch(() => 50),
      getGigCreateFeeCredits().catch(() => 50),
      getMarketplaceListingFeeCredits().catch(() => 0),
    ]);

    const activePackages = (economy?.creditPackages || [])
      .filter((pkg) => pkg && pkg.active !== false)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        credits: Number(pkg.credits),
        pricePhp: Number(pkg.pricePhp),
      }));

    const creditValueRaw = Number(economy?.creditValuePhp);
    const creditValuePhp =
      Number.isFinite(creditValueRaw) && creditValueRaw > 0
        ? creditValueRaw
        : DEFAULT_SETTINGS.economy.creditValuePhp;

    res.status(200).json({
      success: true,
      configuration: {
        siteName: platform?.siteName || DEFAULT_SETTINGS.platform.siteName,
        maintenanceMode: Boolean(platform?.maintenanceMode),
        registrationEnabled: platform?.registrationEnabled !== false,
        supportEmail: platform?.supportEmail || DEFAULT_SETTINGS.platform.supportEmail,
        creditValuePhp,
        creditPackages: activePackages,
        feeSettings: {
          jobPostFeeCredits: Number(jobPostFeeCredits) || 0,
          gigCreateFeeCredits: Number(gigCreateFeeCredits) || 0,
        },
        marketplaceSettings: {
          listingFeeCredits: Number(listingFeeCredits) || 0,
          transactionFeePercent: Number(economy?.marketplaceSettings?.transactionFeePercent ?? 15),
          minPayoutCredits: Number(economy?.marketplaceSettings?.minPayoutCredits ?? 500),
        },
      },
    });
  } catch (error) {
    console.error('Failed to retrieve public configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration',
    });
  }
}

module.exports = {
  getPublicConfigurationController,
};
