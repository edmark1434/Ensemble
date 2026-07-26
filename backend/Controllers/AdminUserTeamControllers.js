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
} = require('../Repositories/AdminUserTeamRepositories');

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
    const data = await updateAccountStatus(accountId, action);
    res.status(200).json({ success: true, data, message: `Account set to ${data.status}` });
  } catch (err) {
    console.error('Error updating account status:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update account status' });
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
        title: req.body?.title,
        reason: req.body?.reason,
        points: req.body?.points,
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

module.exports = {
  getAdminTeamsManagement,
  getAdminUsersManagement,
  getAdminUserTeamOverview,
  patchAdminAccountStatus,
  patchAdminAccountVerification,
  postAdminAccountCreditAdjust,
  postAdminAccountCreditFreeze,
  postAdminAccountWarn,
  postAdminAccountPardon,
};
