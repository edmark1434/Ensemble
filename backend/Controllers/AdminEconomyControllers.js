const { getEconomyOverview, getWalletDetail } = require('../Repositories/AdminEconomyRepositories');

async function getAdminEconomyOverview(req, res) {
  try {
    const data = await getEconomyOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching economy overview:', err);
    res.status(500).json({ success: false, message: 'Failed to load credits & economy data' });
  }
}

async function getAdminWalletDetail(req, res) {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return res.status(400).json({ success: false, message: 'Wallet ID is required' });
    }
    const data = await getWalletDetail(walletId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, message: err.message || 'Wallet not found' });
    }
    console.error('Error fetching wallet detail:', err);
    res.status(500).json({ success: false, message: 'Failed to load wallet detail' });
  }
}

module.exports = { getAdminEconomyOverview, getAdminWalletDetail };
