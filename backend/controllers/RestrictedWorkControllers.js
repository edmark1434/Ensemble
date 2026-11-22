const { listRestrictedWork } = require('../services/RestrictedWorkServices');

/** GET /api/moderator/restricted-work — live contracts with a suspended, locked or banned side. */
async function getRestrictedWork(req, res) {
  try {
    const data = await listRestrictedWork(req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error loading restricted work:', err);
    return res.status(500).json({ success: false, message: 'Failed to load live work with a restricted party' });
  }
}

module.exports = { getRestrictedWork };
