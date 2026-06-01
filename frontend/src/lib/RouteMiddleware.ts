import { createElement, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import useGlobalState from "./global_state";
import api from "./axios";

function getRedirectPath(user: any) {
    if (!user) {
        return null;
    }

    if (user.type === 'Staff') {
        if (user.role === 'Admin') {
            return '/admin';
        }

        if (user.role === 'Support Moderator') {
            return '/moderator/support';
        }

        if (user.role === 'Jobs N Gigs Moderator') {
            return '/moderator/forum';
        }

        if (user.role === 'Forum Moderator') {
            return '/moderator/marketplace';
        }

        if (user.role === 'Dispute Moderator') {
            return '/moderator/dispute';
        }

        return null;
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
    const isPublicRoute = ['/', '/login', '/signup'].includes(location.pathname);

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