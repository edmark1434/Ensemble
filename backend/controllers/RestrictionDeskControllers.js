const {
  searchRestrictionAccounts,
  getViolationsAndRestrictions,
  issueViolation,
  updateAccountRestriction,
} = require('../repositories/ModeratorRepositories');

async function lookupRestrictionAccounts(req, res) {
  try {
    const data = await searchRestrictionAccounts(req.query.q);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error searching restriction accounts:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Account search failed',
    });
  }
}

async function getRestrictions(req, res) {
  try {
    const data = await getViolationsAndRestrictions();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching restrictions:', err);
    res.status(500).json({ success: false, message: 'Failed to load restrictions' });
  }
}

async function postViolation(req, res) {
  try {
    const { accountId, warningId, type, title, reason, points } = req.body;
    if (!accountId || !(warningId || type || title)) {
      return res.status(400).json({ success: false, message: 'accountId and a predefined warning are required' });
    }
    const data = await issueViolation(accountId, {
      warningId,
      type: type || title,
      reason,
      points,
      duration: req.body?.duration,
      days: req.body?.days,
      endsAt: req.body?.endsAt,
    }, req.session);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error issuing violation:', err);
    res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to issue violation' });
  }
}

async function patchRestriction(req, res) {
  try {
    const data = await updateAccountRestriction(req.params.id, req.body.action || req.body.status, req.session, {
      duration: req.body?.duration,
      days: req.body?.days,
      endsAt: req.body?.endsAt,
      reason: req.body?.reason,
      punishmentId: req.body?.punishmentId || req.body?.punishment_id,
      customDuration: req.body?.customDuration === true || req.body?.custom_duration === true,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error updating account restriction:', err);
    res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to update restriction' });
  }
}

module.exports = {
  lookupRestrictionAccounts,
  getRestrictions,
  postViolation,
  patchRestriction,
};
