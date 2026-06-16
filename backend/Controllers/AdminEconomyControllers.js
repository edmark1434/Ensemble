const { getEconomyOverview } = require('../Repositories/AdminEconomyRepositories');

async function getAdminEconomyOverview(req, res) {
  try {
    const data = await getEconomyOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching economy overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load credits & economy data' });
  }
}

module.exports = { getAdminEconomyOverview };
