function normalizeStaffId(id) {
  if (id == null || id === '') return null;
  return String(id).trim().toLowerCase();
}

function isAdminRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'administrator';
}

function isTicketHandlerRole(role) {
  const r = String(role || '').toLowerCase();
  return (
    isAdminRole(role) ||
    r === 'support moderator' ||
    r.includes('forum') ||
    r.includes('marketplace') ||
    r.includes('jobs')
  );
}

/** Basic ticket assignment permissions. */
function buildTicketPermissions(row, staff, sessionStaffId = null) {
  const staffId = normalizeStaffId(staff?.staff_id) || normalizeStaffId(sessionStaffId);
  const role = staff?.role || null;
  const assigneeId = normalizeStaffId(row?.handled_by_staff_id);
  const isAssignee = Boolean(staffId && assigneeId && staffId === assigneeId);
  const isAdmin = isAdminRole(role);
  const unassigned = !assigneeId;
  const designated = isTicketHandlerRole(role);

  return {
    staffId: staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId,
    role,
    isAssignee,
    isAdmin,
    canView: true,
    canAct: isAssignee || (unassigned && designated),
    canAssignOthers: isAdmin || isAssignee,
    canSelfAssign: Boolean(staffId && unassigned && designated),
    canAssignMyself: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
  };
}

module.exports = {
  normalizeStaffId,
  isAdminRole,
  isTicketHandlerRole,
  buildTicketPermissions,
};
