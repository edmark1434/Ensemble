/**
 * Per-penalty appeals: which penalties an account can appeal, and the state of each appeal.
 * Filing goes through `POST /api/users/tickets` (type "Appeal an account penalty" with
 * `appealTarget`), deciding through `POST /api/staff/tickets/:id/appeal-decision`.
 */
const { listAppealablePenalties } = require('../services/PenaltyAppealServices');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** GET /api/users/appeals — the signed-in member's active penalties and their appeals. */
async function getMyAppealOptions(req, res) {
  try {
    const accountId = req.session?.account_id || req.session?.accountId;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Sign in to see your appeals.' });
    }
    const data = await listAppealablePenalties(accountId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error loading appeal options:', err);
    return res.status(500).json({ success: false, message: 'Could not load your penalties.' });
  }
}

/** GET /api/staff/tickets/appeal-options/:accountId — for staff opening an appeal for a member. */
async function getStaffAppealOptions(req, res) {
  try {
    const accountId = String(req.params.accountId || '').trim();
    if (!UUID_RE.test(accountId)) {
      return res.status(400).json({ success: false, message: 'Choose a member account.' });
    }
    const data = await listAppealablePenalties(accountId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error loading staff appeal options:', err);
    return res.status(500).json({ success: false, message: 'Could not load this member’s penalties.' });
  }
}

module.exports = {
  getMyAppealOptions,
  getStaffAppealOptions,
};
