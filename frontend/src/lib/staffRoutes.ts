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
  'Marketplace Moderator',
] as const;

export const STAFF_HOME_BY_ROLE: Record<string, string> = {
  Admin: ADMIN_DASHBOARD,
  ...Object.fromEntries(MODERATOR_ROLES.map((role) => [role, STAFF_PORTAL_DASHBOARD])),
  'Marketplace Moderator': '/moderator/marketplace',
  'Support Moderator': '/moderator/support',
  'Forum Moderator': '/moderator/forum',
  'Jobs N Gigs Moderator': '/moderator/jobs',
};

export function getStaffHomePath(role?: string | null): string {
  if (!role) {
    return STAFF_LOGIN_PATH;
  }
  return STAFF_HOME_BY_ROLE[role] ?? STAFF_PORTAL_DASHBOARD;
}

/** In-console tab that previews the member site. Staff never leave their console for this. */
export function getStaffPlatformViewPath(role?: string | null): string {
  if (role === 'Admin') return '/admin/platform-view';
  if (role === 'Forum Moderator') return '/moderator/forum/platform-view';
  if (role === 'Marketplace Moderator') return '/moderator/marketplace/platform-view';
  if (role === 'Support Moderator') return '/moderator/support/platform-view';
  if (role === 'Jobs N Gigs Moderator' || role === 'Jobs Moderator' || role === 'Jobs & Gigs Moderator') {
    return '/moderator/jobs/platform-view';
  }
  return '/staff/platform-view';
}

export function platformViewPathForConsole(homeTo: string): string {
  if (homeTo.startsWith('/admin')) return '/admin/platform-view';
  if (homeTo.startsWith('/moderator/forum')) return '/moderator/forum/platform-view';
  if (homeTo.startsWith('/moderator/marketplace')) return '/moderator/marketplace/platform-view';
  if (homeTo.startsWith('/moderator/support')) return '/moderator/support/platform-view';
  if (homeTo.startsWith('/moderator/jobs')) return '/moderator/jobs/platform-view';
  return '/staff/platform-view';
}

export function isStaffPortalDashboardPath(pathname: string): boolean {
  return pathname === STAFF_PORTAL_DASHBOARD || pathname.startsWith(`${STAFF_PORTAL_DASHBOARD}/`);
}

export function getStaffRoleForPath(pathname: string): string | undefined {
  if (pathname === '/admin/platform-view' || pathname.startsWith('/admin/platform-view/')) {
    return 'Admin';
  }
  if (pathname === '/staff/platform-view' || pathname.startsWith('/staff/platform-view/')) {
    return STAFF_PORTAL_ANY_MODERATOR;
  }
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
