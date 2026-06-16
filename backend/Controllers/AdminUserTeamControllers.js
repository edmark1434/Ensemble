const {
  getTeamsManagement,
  getUsersManagement,
  getUserTeamOverview,
} = require('../Repositories/AdminUserTeamRepositories');

async function getAdminTeamsManagement(req, res) {
  try {
    const data = await getTeamsManagement();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching team management:', err);
    res.status(500).json({ success: false, message: 'Failed to load team accounts' });
  }
}

async function getAdminUsersManagement(req, res) {
  try {
    const data = await getUsersManagement();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching user management:', err);
    res.status(500).json({ success: false, message: 'Failed to load user accounts' });
  }
}

async function getAdminUserTeamOverview(req, res) {
  try {
    const data = await getUserTeamOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching user-team overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load user & team overview' });
  }
}

module.exports = {
  getAdminTeamsManagement,
  getAdminUsersManagement,
  getAdminUserTeamOverview,
};
