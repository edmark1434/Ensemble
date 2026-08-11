import { createElement, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import useGlobalState from "./global_state";
import api from "./axios";
import { getStaffHomePath } from "./staffRoutes";

function getRedirectPath(user: { type?: string; role?: string | null } | null) {
    if (!user) {
        return null;
    }

    if (user.type === 'Staff') {
        return getStaffHomePath(user.role);
    }

    if (user.type === 'User') {
        return '/home';
    }

    return null;
}

export default function RouteMiddleware() {
    const { user } = useGlobalState();
    const navigate = useNavigate();
    const location = useLocation();
    const [resolvedUser, setResolvedUser] = useState(user);
    const [isCheckingSession, setIsCheckingSession] = useState(!user);
    const [onboardingPath, setOnboardingPath] = useState<string | null | undefined>(undefined);
    const [onboardingCheckedRoute, setOnboardingCheckedRoute] = useState<string | null>(null);
    const basePublicRoutes = ['/', '/login', '/signup', '/admin', '/staff'];
    const isPublicRoute =
        basePublicRoutes.includes(location.pathname) ||
        location.pathname.startsWith('/landing/');
    const isOnboardingRoute = location.pathname.startsWith('/setup/');
    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            if (user) {
                setResolvedUser(user);
                setIsCheckingSession(false);
                return;
            }

            try {
                const result = await api.get('api/users/me');
                if (!cancelled && result.status === 200) {
                    const currentUser = result.data?.user ?? result.data;
                    useGlobalState.getState().setUser(currentUser);
                    setResolvedUser(currentUser);
                }
            } catch {
                // No active session: render nested public route.
                if (!cancelled) {
                    setResolvedUser(null);
                }
            } finally {
                if (!cancelled) {
                    setIsCheckingSession(false);
                }
            }
        };

        checkSession();

        return () => {
            cancelled = true;
        };
    }, [user]);

    useEffect(() => {
        let cancelled = false;
        if (!resolvedUser) {
            setOnboardingPath(null);
            setOnboardingCheckedRoute(location.pathname);
            return;
        }
        if (resolvedUser.type !== 'User') {
            setOnboardingPath(null);
            setOnboardingCheckedRoute(location.pathname);
            return;
        }
        const checkedRoute = location.pathname;
        setOnboardingPath(undefined);
        setOnboardingCheckedRoute(null);
        api.get('/api/onboarding/state')
            .then((response) => {
                if (!cancelled) {
                    setOnboardingPath(response.data.completed ? null : response.data.path || '/setup/personal-details');
                    setOnboardingCheckedRoute(checkedRoute);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setOnboardingPath('/setup/personal-details');
                    setOnboardingCheckedRoute(checkedRoute);
                }
            });
        return () => { cancelled = true; };
    }, [resolvedUser, location.pathname]);

    const redirectPath = useMemo(() => {
        if (isCheckingSession) {
            return null;
        }

        if (resolvedUser?.type === 'User' && onboardingPath === undefined) {
            return null;
        }

        return onboardingPath || getRedirectPath(resolvedUser);
    }, [isCheckingSession, resolvedUser, onboardingPath]);

    const shouldAutoRedirect = useMemo(() => {
        return isPublicRoute;
    }, [isPublicRoute]);

    useEffect(() => {
        if (!redirectPath || !shouldAutoRedirect) {
            return;
        }

        navigate(redirectPath, { replace: true });
    }, [navigate, redirectPath, shouldAutoRedirect]);

    useEffect(() => {
        if (isCheckingSession || onboardingPath === undefined || onboardingCheckedRoute !== location.pathname || !resolvedUser || resolvedUser.type !== 'User') return;
        if (onboardingPath && !isOnboardingRoute) {
            navigate(onboardingPath, { replace: true });
        } else if (!onboardingPath && isOnboardingRoute) {
            navigate('/home', { replace: true });
        }
    }, [isCheckingSession, onboardingPath, onboardingCheckedRoute, resolvedUser, location.pathname, isOnboardingRoute, navigate]);

    useEffect(() => {
        if (isCheckingSession || resolvedUser || isPublicRoute) {
            return;
        }

        navigate('/', { replace: true });
    }, [isCheckingSession, resolvedUser, isPublicRoute, navigate]);

    if ((isCheckingSession || (resolvedUser?.type === 'User' && (onboardingPath === undefined || onboardingCheckedRoute !== location.pathname))) && !isPublicRoute && !isOnboardingRoute) {
        return createElement('div', {
            style: { minHeight: '100vh', background: '#080a12' },
            'aria-label': 'Loading account',
        });
    }

    if (!resolvedUser && !isPublicRoute) {
        return null;
    }

    if (shouldAutoRedirect && redirectPath) {
        return null;
    }

    return createElement(Outlet);
}
