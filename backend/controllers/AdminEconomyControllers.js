const {
  getEconomyOverview,
  listEconomyWallets,
  listEconomyLedger,
  getEconomyWalletDetail,
} = require('../services/AdminEconomyServices');

function sendError(res, err, fallback) {
  const status = Number(err.statusCode || err.status) || 500;
  if (status >= 500) {
    console.error(`${fallback}:`, err);
    return res.status(500).json({ success: false, message: fallback });
  }
  return res.status(status).json({ success: false, message: err.message || fallback });
}

async function getAdminEconomyOverview(req, res) {
  try {
    const data = await getEconomyOverview(req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load credits & economy data');
  }
}

async function getAdminEconomyWallets(req, res) {
  try {
    const data = await listEconomyWallets(req.session, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load wallets');
  }
}

async function getAdminEconomyLedger(req, res) {
  try {
    const data = await listEconomyLedger(req.session, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load the credit ledger');
  }
}

async function getAdminWalletDetail(req, res) {
  try {
    const data = await getEconomyWalletDetail(req.session, req.params.walletId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load wallet detail');
  }
}

module.exports = {
  getAdminEconomyOverview,
  getAdminEconomyWallets,
  getAdminEconomyLedger,
  getAdminWalletDetail,
};
