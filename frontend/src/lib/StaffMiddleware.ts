import { createElement, useEffect, useRef, useState } from 'react';
import useGlobalState from './global_state';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from './axios';
import {
  ADMIN_LOGIN_PATH,
  STAFF_LOGIN_PATH,
  STAFF_PORTAL_ANY_MODERATOR,
  getStaffHomePath,
  getStaffRoleForPath,
  canAccessStaffPortalDashboard,
} from './staffRoutes';

function staffRoleMatches(requiredRole: string, userRole?: string | null): boolean {
  if (!userRole) {
    return false;
  }
  if (requiredRole === STAFF_PORTAL_ANY_MODERATOR) {
    return canAccessStaffPortalDashboard(userRole);
  }
  return userRole === requiredRole;
}

function getLoginPathForRoute(requiredRole?: string): string {
  if (requiredRole === 'Admin') {
    return ADMIN_LOGIN_PATH;
  }
  return STAFF_LOGIN_PATH;
}

export default function StaffMiddleware() {
  const { user, setUser } = useGlobalState();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const lastAllowedPathRef = useRef<string>('/');

  const requiredRole = getStaffRoleForPath(location.pathname);

  const goToPortalLogin = () => {
    navigate(getLoginPathForRoute(requiredRole), { replace: true });
  };

  const goToPreviousAllowedPath = (role?: string) => {
    const roleHome = role ? getStaffHomePath(role) : undefined;
    const fallbackPath =
      lastAllowedPathRef.current !== location.pathname
        ? lastAllowedPathRef.current
        : roleHome || '/';

    navigate(fallbackPath, { replace: true });
  };

  useEffect(() => {
    if (isAuthorized) {
      lastAllowedPathRef.current = location.pathname;
    }
  }, [isAuthorized, location.pathname]);

  useEffect(() => {
    if (!requiredRole) {
      setIsAuthorized(true);
      return;
    }

    if (user?.type === 'Staff' && staffRoleMatches(requiredRole, user.role)) {
      setIsAuthorized(true);
      return;
    }

    if (user?.type === 'Staff') {
      setIsAuthorized(false);
      goToPreviousAllowedPath(user.role);
      return;
    }

    if (user && user.type !== 'Staff') {
      setIsAuthorized(false);
      goToPortalLogin();
      return;
    }

    if (!user) {
      const checkStaffRole = async () => {
        try {
          const response = await api.get('/api/staff/check-staff-role', {
            withCredentials: true,
          });

          if (response.data.success && response.status === 200) {
            const staffRole = response.data.role;
            const sessionUser = response.data.user ?? response.data.credentials;
            setUser(sessionUser);

            if (staffRoleMatches(requiredRole, staffRole)) {
              setIsAuthorized(true);
            } else {
              setIsAuthorized(false);
              goToPreviousAllowedPath(staffRole);
            }
          } else {
            setIsAuthorized(false);
            goToPortalLogin();
          }
        } catch {
          setIsAuthorized(false);
          goToPortalLogin();
        }
      };

      void checkStaffRole();
    }
  }, [user, location.pathname, requiredRole, navigate]);

  if (isAuthorized === null) {
    return createElement(
      'div',
      {
        className:
          'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
      },
      createElement(
        'div',
        {
          className:
            'flex min-w-[260px] flex-col items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 px-8 py-6 shadow-2xl',
        },
        createElement('div', {
          className:
            'h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent',
        }),
        createElement(
          'div',
          { className: 'text-center' },
          createElement('p', {
            className: 'text-sm font-medium text-white',
            children: 'Verifying access',
          }),
          createElement('p', {
            className: 'mt-1 text-xs text-zinc-300',
            children: 'Please wait a moment...',
          })
        )
      )
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return createElement(Outlet);
}
