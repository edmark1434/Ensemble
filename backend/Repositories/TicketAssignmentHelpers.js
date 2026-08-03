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

/** Basic ticket assignment permissions. Admin may override locks and escalate. */
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
    canAct: Boolean(isAdmin || isAssignee || (unassigned && designated)),
    /** Admin may pick / reassign handlers at any time */
    canAssignOthers: Boolean(isAdmin),
    canSelfAssign: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    canAssignMyself: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    /** Current handler or Admin may release */
    canRelease: Boolean(isAssignee || (isAdmin && Boolean(assigneeId))),
    /** Escalate only when you own the ticket; Admin may always escalate */
    canEscalate: Boolean(isAssignee || isAdmin),
  };
}

module.exports = {
  normalizeStaffId,
  isAdminRole,
  isTicketHandlerRole,
  buildTicketPermissions,
};
