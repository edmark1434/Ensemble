const {
  createStaffAccount,
  ALLOWED_STAFF_ROLES,
  MODERATOR_ROLES,
} = require('../Repositories/StaffRepositories');

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
  getAdminStaffRoles,
};
