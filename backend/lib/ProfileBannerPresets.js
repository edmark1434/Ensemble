// Must match the files in frontend/public/profile_banner_presets and frontend/src/lib/profileBanners.ts.
const PROFILE_BANNER_PRESETS = Object.freeze([
    'Alpha Banner.png',
    'Beta Banner.png',
    'Business Sleek.png',
    'Ensemble Blue.png',
    'Ensemble Purple.png',
    'Ensemble Yellow.png',
    'Freemium Sleek.png',
    'Go Beyond Edit 2026.png',
    'Premium Sleek.png',
    'Raster.png',
    'Spreadshot.png',
]);

// Banner preset -> badge registry_id the account must have claimed to use it.
const BANNER_REQUIRED_BADGES = Object.freeze({
    'Alpha Banner.png': 'acc-alpha',
    'Beta Banner.png': 'acc-beta',
});

module.exports = { PROFILE_BANNER_PRESETS, BANNER_REQUIRED_BADGES };
