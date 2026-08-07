const { getAnalyticsOverview } = require('../repositories/AdminAnalyticsRepositories');

async function getAdminAnalyticsOverview(req, res) {
  try {
    const data = await getAnalyticsOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
}

module.exports = { getAdminAnalyticsOverview };
