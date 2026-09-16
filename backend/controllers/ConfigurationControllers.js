const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { DEFAULT_SETTINGS } = require('../lib/PlatformConfiguration');

async function getPublicConfigurationController(req, res) {
  try {
    const [platform, economy] = await Promise.all([
      getSectionValue('platform').catch(() => DEFAULT_SETTINGS.platform),
      getSectionValue('economy').catch(() => DEFAULT_SETTINGS.economy),
    ]);

    const activePackages = (economy?.creditPackages || [])
      .filter((pkg) => pkg && pkg.active !== false)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        credits: Number(pkg.credits),
        pricePhp: Number(pkg.pricePhp),
      }));

    res.status(200).json({
      success: true,
      configuration: {
        siteName: platform?.siteName || DEFAULT_SETTINGS.platform.siteName,
        tagline: platform?.tagline || DEFAULT_SETTINGS.platform.tagline,
        maintenanceMode: Boolean(platform?.maintenanceMode),
        registrationEnabled: platform?.registrationEnabled !== false,
        supportEmail: platform?.supportEmail || DEFAULT_SETTINGS.platform.supportEmail,
        maxUploadMb: Number(platform?.maxUploadMb) || DEFAULT_SETTINGS.platform.maxUploadMb,
        creditPackages: activePackages,
        marketplaceSettings: {
          listingFeeCredits: Number(economy?.marketplaceSettings?.listingFeeCredits ?? 0),
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
