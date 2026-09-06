const {
  getTeamsManagement,
  getUsersManagement,
  getUserTeamOverview,
  updateAccountStatus,
  updateAccountVerification,
  adjustAccountCredits,
  freezeAccountCredits,
  warnAccount,
  pardonAccount,
} = require('../repositories/AdminUserTeamRepositories');
const { listAccountActivity } = require('../repositories/AccountActivityRepositories');
const { assertStatusActionAllowed } = require('../lib/UserTeamPermissions');
const {
  getAdminVerificationDetails,
  applyAdminDiditVerificationAction,
} = require('../services/AdminVerificationServices');

function staffIdFromSession(session) {
  return session?.staffId || session?.staff_id || null;
}

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

async function getAdminUserVerificationDetails(req, res) {
  try {
    const data = await getAdminVerificationDetails(req.params.accountId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching user verification details:', err);
    res.status(500).json({ success: false, message: 'Failed to load verification details' });
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

async function patchAdminAccountStatus(req, res) {
  try {
    const { accountId } = req.params;
    const action = req.body?.action || req.body?.status;
    if (!accountId || !action) {
      return res.status(400).json({ success: false, message: 'accountId and action are required' });
    }
    assertStatusActionAllowed(req.session, action);
    const data = await updateAccountStatus(accountId, action, staffIdFromSession(req.session));
    res.status(200).json({ success: true, data, message: `Account set to ${data.status}` });
  } catch (err) {
    console.error('Error updating account status:', err);
    const code = err.statusCode === 403 ? 403 : 400;
    res.status(code).json({ success: false, message: err.message || 'Failed to update account status' });
  }
}

async function patchAdminAccountVerification(req, res) {
  try {
    const { accountId } = req.params;
    const action = req.body?.action || req.body?.status;
    if (!accountId || !action) {
      return res.status(400).json({ success: false, message: 'accountId and action are required' });
    }
    const data = await updateAccountVerification(accountId, action, staffIdFromSession(req.session), {
      validityDays: req.body?.validityDays ?? req.body?.validity_days,
    });
    const durationNote =
      data.validityDays != null ? ` (valid for ${data.validityDays} day${data.validityDays === 1 ? '' : 's'})` : '';
    res.status(200).json({
      success: true,
      data,
      message: `Verification updated to ${data.verificationStatus}${durationNote}`,
    });
  } catch (err) {
    console.error('Error updating verification:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update verification' });
  }
}

async function runAdminDiditVerificationAction(req, res, action) {
  try {
    const data = await applyAdminDiditVerificationAction(req.params.accountId, action, {
      validityDays: req.body?.validityDays ?? req.body?.validity_days,
      verifiedByAccountId: req.session?.account_id,
      comment: req.body?.comment,
      reverificationRequirements: req.body?.reverificationRequirements,
    });
    const message = data.mode === 'team_local_update'
      ? `Team verification updated to ${data.verificationStatus}`
      : data.mode === 'no_change'
      ? 'Verification is already approved with the selected validity period'
      : data.mode === 'expiry_updated'
        ? 'Verification expiry updated'
        : `Didit ${action} request submitted`;
    return res.status(200).json({ success: true, data, message });
  } catch (err) {
    console.error(`Error applying Didit ${action} action:`, err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : `Failed to submit Didit ${action} request`,
    });
  }
}

async function approveAdminAccountVerification(req, res) {
  return runAdminDiditVerificationAction(req, res, 'approve');
}

async function declineAdminAccountVerification(req, res) {
  return runAdminDiditVerificationAction(req, res, 'decline');
}

async function resubmitAdminAccountVerification(req, res) {
  return runAdminDiditVerificationAction(req, res, 'reverify');
}

async function postAdminAccountCreditAdjust(req, res) {
  try {
    const { accountId } = req.params;
    const amount = req.body?.amount;
    const note = req.body?.note;
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required' });
    }
    const data = await adjustAccountCredits(accountId, amount, note, staffIdFromSession(req.session));
    res.status(200).json({ success: true, data, message: 'Credits adjusted' });
  } catch (err) {
    console.error('Error adjusting credits:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to adjust credits' });
  }
}

async function postAdminAccountCreditFreeze(req, res) {
  try {
    const { accountId } = req.params;
    const freeze = req.body?.freeze !== false;
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required' });
    }
    const data = await freezeAccountCredits(accountId, freeze);
    res.status(200).json({
      success: true,
      data,
      message: data.frozen ? 'Credits frozen' : 'Credits unfrozen',
    });
  } catch (err) {
    console.error('Error freezing credits:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to freeze credits' });
  }
}

async function postAdminAccountWarn(req, res) {
  try {
    const { accountId } = req.params;
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required' });
    }
    const data = await warnAccount(
      accountId,
      {
        type: req.body?.type || req.body?.title,
        reason: req.body?.reason,
        points: req.body?.points,
        expiresAt: req.body?.expiresAt,
      },
      staffIdFromSession(req.session)
    );
    res.status(200).json({ success: true, data, message: 'Warning issued' });
  } catch (err) {
    console.error('Error issuing warning:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to issue warning' });
  }
}

async function postAdminAccountPardon(req, res) {
  try {
    const { accountId } = req.params;
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required' });
    }
    const data = await pardonAccount(accountId, staffIdFromSession(req.session), {
      note: req.body?.note,
    });
    res.status(200).json({
      success: true,
      data,
      message: `Pardon issued — ${data.violationsCleared} violation(s) cleared, account set to Active`,
    });
  } catch (err) {
    console.error('Error issuing pardon:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to issue pardon' });
  }
}

async function getAdminAccountActivity(req, res) {
  try {
    const { accountId } = req.params;
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required' });
    }
    const data = await listAccountActivity(accountId, {
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching account activity:', err);
    res.status(500).json({ success: false, message: 'Failed to load account activity' });
  }
}

module.exports = {
  getAdminTeamsManagement,
  getAdminUsersManagement,
  getAdminUserVerificationDetails,
  getAdminUserTeamOverview,
  getAdminAccountActivity,
  patchAdminAccountStatus,
  patchAdminAccountVerification,
  approveAdminAccountVerification,
  declineAdminAccountVerification,
  resubmitAdminAccountVerification,
  postAdminAccountCreditAdjust,
  postAdminAccountCreditFreeze,
  postAdminAccountWarn,
  postAdminAccountPardon,
};
