export const STAFF_PORTAL_DASHBOARD = '/staff/dashboard';
export const ADMIN_DASHBOARD = '/admin/dashboard';
export const STAFF_LOGIN_PATH = '/staff';
export const ADMIN_LOGIN_PATH = '/admin';

/** Sentinel: any non-admin staff role may access the staff portal dashboard. */
export const STAFF_PORTAL_ANY_MODERATOR = '__staff_portal__';

const MODERATOR_ROLES = [
  'Support Moderator',
  'Jobs N Gigs Moderator',
  'Forum Moderator',
  'Dispute Moderator',
] as const;

export const STAFF_HOME_BY_ROLE: Record<string, string> = {
  Admin: ADMIN_DASHBOARD,
  ...Object.fromEntries(MODERATOR_ROLES.map((role) => [role, STAFF_PORTAL_DASHBOARD])),
};

export function getStaffHomePath(role?: string | null): string {
  if (!role) {
    return STAFF_LOGIN_PATH;
  }
  return STAFF_HOME_BY_ROLE[role] ?? STAFF_PORTAL_DASHBOARD;
}

export function isStaffPortalDashboardPath(pathname: string): boolean {
  return pathname === STAFF_PORTAL_DASHBOARD || pathname.startsWith(`${STAFF_PORTAL_DASHBOARD}/`);
}

export function getStaffRoleForPath(pathname: string): string | undefined {
  if (isStaffPortalDashboardPath(pathname)) {
    return STAFF_PORTAL_ANY_MODERATOR;
  }

  return Object.entries(STAFF_HOME_BY_ROLE).find(([role, path]) => {
    if (role === 'Admin' || path === STAFF_PORTAL_DASHBOARD) {
      return false;
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  })?.[0];
}

export function canAccessStaffPortalDashboard(role?: string | null): boolean {
  return Boolean(role && role !== 'Admin' && STAFF_HOME_BY_ROLE[role] === STAFF_PORTAL_DASHBOARD);
}
