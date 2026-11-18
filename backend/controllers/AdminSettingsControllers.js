const {
  SettingsServiceError,
  getAdminSettingsOverview: getAdminSettingsOverviewService,
  updateAdminSettingsSection,
} = require('../services/AdminSettingsServices');

function requesterIp(req) {
  return req.ip || req.socket?.remoteAddress || null;
}

async function getAdminSettingsOverview(req, res) {
  try {
    const data = await getAdminSettingsOverviewService({ requesterIp: requesterIp(req) });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching settings overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load system settings' });
  }
}

async function patchAdminSettings(req, res) {
  try {
    const { section, values, baseVersion } = req.body || {};
    const result = await updateAdminSettingsSection({
      section,
      values,
      baseVersion: baseVersion ?? null,
      session: req.session,
      requesterIp: requesterIp(req),
    });
    res.status(200).json({
      success: true,
      data: result.overview,
      changed: result.changed,
      changeCount: result.changes.length,
    });
  } catch (err) {
    if (err instanceof SettingsServiceError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
        errors: err.errors || undefined,
      });
    }
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
}

module.exports = { getAdminSettingsOverview, patchAdminSettings };
