const {
  getSettingsOverview,
  updateSettingsSection,
} = require('../repositories/AdminSettingsRepositories');

async function getAdminSettingsOverview(req, res) {
  try {
    const data = await getSettingsOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching settings overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load system settings' });
  }
}

async function patchAdminSettings(req, res) {
  try {
    const { section, values } = req.body;
    if (!section || !values || typeof values !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request must include section and values object',
      });
    }
    const data = await updateSettingsSection(section, values);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating settings:', err);
    const message = err.message?.includes('Unknown') ? err.message : 'Failed to save settings';
    res.status(500).json({ success: false, message });
  }
}

module.exports = { getAdminSettingsOverview, patchAdminSettings };
