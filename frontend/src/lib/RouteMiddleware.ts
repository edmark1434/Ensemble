import { createElement, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import useGlobalState from "./global_state";
import api from "./axios";
import { getStaffHomePath } from "./staffRoutes";

function getRedirectPath(user: any) {
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
    const basePublicRoutes = ['/', '/login', '/signup', '/admin', '/staff'];
    const isPublicRoute =
        basePublicRoutes.includes(location.pathname) ||
        location.pathname.startsWith('/landing/');
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

    const redirectPath = useMemo(() => {
        if (isCheckingSession) {
            return null;
        }

        return getRedirectPath(resolvedUser);
    }, [isCheckingSession, resolvedUser]);

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
        if (isCheckingSession || resolvedUser || isPublicRoute) {
            return;
        }

        navigate('/', { replace: true });
    }, [isCheckingSession, resolvedUser, isPublicRoute, navigate]);

    if (isCheckingSession && !isPublicRoute) {
        return null;
    }

    if (!resolvedUser && !isPublicRoute) {
        return null;
    }

    if (shouldAutoRedirect && redirectPath) {
        return null;
    }

    return createElement(Outlet);
}