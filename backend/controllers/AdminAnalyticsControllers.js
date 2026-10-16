const {
  getAdminAnalyticsOverviewService,
  getAdminPlatformTransactionsService,
  getAdminUserTransactionsService,
  getAdminTopupTransactionsService,
} = require('../services/AdminAnalyticsServices');

async function getAdminAnalyticsOverview(req, res) {
  try {
    const data = await getAdminAnalyticsOverviewService();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
}

async function getAdminPlatformTransactions(req, res) {
  try {
    const result = await getAdminPlatformTransactionsService(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching platform transactions:', err);
    res.status(500).json({ success: false, message: 'Failed to load platform transactions' });
  }
}

async function getAdminUserTransactions(req, res) {
  try {
    const result = await getAdminUserTransactionsService(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching user transactions:', err);
    res.status(500).json({ success: false, message: 'Failed to load user transactions' });
  }
}

async function getAdminTopupTransactions(req, res) {
  try {
    const result = await getAdminTopupTransactionsService(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching topup transactions:', err);
    res.status(500).json({ success: false, message: 'Failed to load topup transactions' });
  }
}

module.exports = {
  getAdminAnalyticsOverview,
  getAdminPlatformTransactions,
  getAdminUserTransactions,
  getAdminTopupTransactions,
};

