const { getDashboardOverview } = require('../repositories/AdminRepositories');
const { attachStaffPresence } = require('../services/StaffPresenceServices');

async function getAdminDashboardOverview(req, res) {
  try {
    const overview = await getDashboardOverview();
    overview.staffRoster = await attachStaffPresence(overview.staffRoster);
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (err) {
    console.error('Error fetching admin dashboard overview:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load admin dashboard data',
    });
  }
}

module.exports = {
  getAdminDashboardOverview,
};
