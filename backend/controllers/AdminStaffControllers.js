const {
  createStaffAccount,
  updateStaffAccount,
  deleteStaffAccount,
  ALLOWED_STAFF_ROLES,
  MODERATOR_ROLES,
} = require('../repositories/StaffRepositories');

function staffIdFromSession(session) {
  return session?.staffId || session?.staff_id || null;
}

async function createAdminStaff(req, res) {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      emailAddress,
      password,
      role,
    } = req.body || {};

    const data = await createStaffAccount({
      firstName,
      lastName,
      username,
      emailAddress: emailAddress || email,
      password,
      role,
    });

    res.status(201).json({
      success: true,
      message: `${data.role} account created for ${data.name}`,
      data,
    });
  } catch (err) {
    console.error('Error creating staff account:', err);
    const status = err.status || (err.code === '23505' ? 409 : 400);
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to create staff account',
    });
  }
}

async function patchAdminStaff(req, res) {
  try {
    const { staffId } = req.params;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Staff ID is required' });
    }
    const data = await updateStaffAccount(staffId, req.body || {});
    res.status(200).json({
      success: true,
      message: `Updated ${data.name}`,
      data,
    });
  } catch (err) {
    console.error('Error updating staff account:', err);
    const status = err.status || (err.code === '23505' ? 409 : 500);
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to update staff account',
    });
  }
}

async function deleteAdminStaff(req, res) {
  try {
    const { staffId } = req.params;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Staff ID is required' });
    }
    const data = await deleteStaffAccount(staffId, staffIdFromSession(req.session));
    res.status(200).json({
      success: true,
      message: 'Staff account deleted',
      data,
    });
  } catch (err) {
    console.error('Error deleting staff account:', err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to delete staff account',
    });
  }
}

async function getAdminStaffRoles(_req, res) {
  res.status(200).json({
    success: true,
    data: {
      roles: ALLOWED_STAFF_ROLES,
      moderatorRoles: MODERATOR_ROLES,
    },
  });
}

module.exports = {
  createAdminStaff,
  patchAdminStaff,
  deleteAdminStaff,
  getAdminStaffRoles,
};
