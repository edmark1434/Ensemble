const { getModerationOverview } = require('../Repositories/AdminModerationRepositories');

async function getAdminModerationOverview(req, res) {
  try {
    const data = await getModerationOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching moderation overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load moderation data' });
  }
}

module.exports = { getAdminModerationOverview };
