import { createElement, Fragment, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import useGlobalState from "./global_state";
import api from "./axios";
import { getStaffHomePath } from "./staffRoutes";
import { ONBOARDING_COMPLETED_EVENT, ONBOARDING_STEP_CHANGED_EVENT, wasOnboardingCompleted } from "./onboardingEvents";
import { ProfileLoadingState } from "@/pages/user/7_profile/Displays/ProfileLoadingState.tsx";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { isGuestAllowedPath } from "./guestRouteAccess";

type OnboardingGateState = {
    accountId: string | null;
    path: string | null | undefined;
    verificationFailed: boolean;
};

let pendingSessionRequest: Promise<unknown> | null = null;
const pendingOnboardingRequests = new Map<string, Promise<string | null>>();

function requestSession() {
    if (!pendingSessionRequest) {
        pendingSessionRequest = api.get('api/users/me').finally(() => {
            pendingSessionRequest = null;
        });
    }
    return pendingSessionRequest;
}

function requestOnboardingPath(accountId: string) {
    if (wasOnboardingCompleted(accountId)) return Promise.resolve(null);

    const existingRequest = pendingOnboardingRequests.get(accountId);
    if (existingRequest) return existingRequest;

    const request = api.get('/api/onboarding/state')
        .then((response) => response.data.completed
            ? null
            : response.data.path || '/setup/upload-image')
        .then((path) => wasOnboardingCompleted(accountId) ? null : path)
        .finally(() => {
            pendingOnboardingRequests.delete(accountId);
        });

    pendingOnboardingRequests.set(accountId, request);
    return request;
}

function RouteLoadingShell() {
    return createElement(ProfileLoadingState);
}

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
    const { user, isGuestMode } = useGlobalState();
    const navigate = useNavigate();
    const location = useLocation();
    const [resolvedUser, setResolvedUser] = useState(user);
    const [isCheckingSession, setIsCheckingSession] = useState(!user);
    const [isGuestLoginOpen, setIsGuestLoginOpen] = useState(false);
    const [onboardingGate, setOnboardingGate] = useState<OnboardingGateState>(() => ({
        accountId: user?.type === 'User' ? String(user.account_id) : null,
        path: user?.type === 'User' ? undefined : null,
        verificationFailed: false,
    }));
    const basePublicRoutes = [
        '/',
        '/login',
        '/signup',
        '/admin',
        '/staff',
        '/verify-email',
        '/forgot-password',
        '/reset-password',
    ];
    const isPublicRoute =
        basePublicRoutes.includes(location.pathname) ||
        location.pathname.startsWith('/landing/');
    const isOnboardingRoute = location.pathname.startsWith('/setup/');

    const isGuestAllowedRoute = isGuestAllowedPath(location.pathname);
    const isGuestAccessBlocked = !resolvedUser
        && isGuestMode
        && !isPublicRoute
        && !isGuestAllowedRoute;

    useEffect(() => {
        if (!isCheckingSession && !resolvedUser && !isGuestMode && isGuestAllowedRoute) {
            useGlobalState.getState().setIsGuestMode(true);
        }
    }, [isCheckingSession, resolvedUser, isGuestMode, isGuestAllowedRoute]);

    useEffect(() => {
        if (isCheckingSession || !isGuestAccessBlocked) return;
        setIsGuestLoginOpen(true);
        navigate('/home', { replace: true });
    }, [isCheckingSession, isGuestAccessBlocked, navigate]);

    useEffect(() => {
        if (resolvedUser) setIsGuestLoginOpen(false);
    }, [resolvedUser]);

    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            if (user) {
                setResolvedUser(user);
                setIsCheckingSession(false);
                return;
            }

            // A transition from an authenticated local user to no local user is
            // an explicit logout. Do not immediately restore the session that
            // the logout request has just invalidated.
            if (resolvedUser) {
                setResolvedUser(null);
                setOnboardingGate({ accountId: null, path: null, verificationFailed: false });
                setIsCheckingSession(false);
                return;
            }

            try {
                const result = await requestSession() as {
                    status: number;
                    data?: { user?: unknown } | unknown;
                };
                if (!cancelled && result.status === 200) {
                    const responseData = result.data as { user?: unknown } | undefined;
                    const currentUser = responseData?.user ?? result.data;
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
            setOnboardingGate({ accountId: null, path: null, verificationFailed: false });
            return;
        }
        if (resolvedUser.type !== 'User') {
            setOnboardingGate({ accountId: null, path: null, verificationFailed: false });
            return;
        }

        const accountId = String(resolvedUser.account_id);
        setOnboardingGate((current) =>
            current.accountId === accountId
                ? current
                : { accountId, path: undefined, verificationFailed: false }
        );

        void requestOnboardingPath(accountId)
            .then((path) => {
                if (!cancelled) {
                    setOnboardingGate({ accountId, path, verificationFailed: false });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setOnboardingGate({ accountId, path: undefined, verificationFailed: true });
                }
            });
        return () => { cancelled = true; };
    }, [resolvedUser?.account_id, resolvedUser?.type]);

    useEffect(() => {
        const handleOnboardingCompleted = (event: Event) => {
            if (!resolvedUser || resolvedUser.type !== 'User') return;

            const accountId = String(resolvedUser.account_id);
            const completedAccountId = (event as CustomEvent<{ accountId?: string | null }>).detail?.accountId;
            if (completedAccountId && completedAccountId !== accountId) return;

            setOnboardingGate({ accountId, path: null, verificationFailed: false });
        };

        window.addEventListener(ONBOARDING_COMPLETED_EVENT, handleOnboardingCompleted);
        return () => window.removeEventListener(ONBOARDING_COMPLETED_EVENT, handleOnboardingCompleted);
    }, [resolvedUser?.account_id, resolvedUser?.type]);

    useEffect(() => {
        const handleOnboardingStepChanged = (event: Event) => {
            if (!resolvedUser || resolvedUser.type !== 'User') return;

            const accountId = String(resolvedUser.account_id);
            const detail = (event as CustomEvent<{ accountId?: string | null; path?: string }>).detail;
            if (detail?.accountId && detail.accountId !== accountId) return;
            if (!detail?.path?.startsWith('/setup/')) return;

            setOnboardingGate({ accountId, path: detail.path, verificationFailed: false });
        };

        window.addEventListener(ONBOARDING_STEP_CHANGED_EVENT, handleOnboardingStepChanged);
        return () => window.removeEventListener(ONBOARDING_STEP_CHANGED_EVENT, handleOnboardingStepChanged);
    }, [resolvedUser?.account_id, resolvedUser?.type]);
    const resolvedAccountId = resolvedUser?.type === 'User'
        ? String(resolvedUser.account_id)
        : null;
    const onboardingPath = resolvedAccountId === null
        ? null
        : wasOnboardingCompleted(resolvedAccountId)
            ? null
            : onboardingGate.accountId === resolvedAccountId
                ? onboardingGate.path
                : undefined;
    const isLocalSignOutTransition = !user && Boolean(resolvedUser);
    const onboardingVerificationFailed = resolvedAccountId !== null
        && onboardingGate.accountId === resolvedAccountId
        && onboardingGate.verificationFailed;

    const redirectPath = useMemo(() => {
        if (isCheckingSession || isLocalSignOutTransition) {
            return null;
        }

        if (resolvedUser?.type === 'User' && onboardingPath === undefined) {
            return null;
        }

        return onboardingPath || getRedirectPath(resolvedUser);
    }, [isCheckingSession, isLocalSignOutTransition, resolvedUser, onboardingPath]);

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
        if (isCheckingSession || onboardingPath === undefined || !resolvedUser || resolvedUser.type !== 'User') return;
        if (onboardingPath && location.pathname !== onboardingPath) {
            navigate(onboardingPath, { replace: true });
        } else if (!onboardingPath && isOnboardingRoute) {
            navigate('/home', { replace: true });
        }
    }, [isCheckingSession, onboardingPath, resolvedUser, isOnboardingRoute, location.pathname, navigate]);

    useEffect(() => {
        if (isCheckingSession || resolvedUser || isGuestMode || isPublicRoute || isGuestAllowedRoute) {
            return;
        }

        navigate('/', { replace: true });
    }, [isCheckingSession, resolvedUser, isGuestMode, isPublicRoute, isGuestAllowedRoute, navigate]);

    if (onboardingVerificationFailed) {
        return createElement(RouteLoadingShell);
    }

    if (isGuestAccessBlocked) {
        return createElement(RouteLoadingShell);
    }

    if ((isCheckingSession || (resolvedUser?.type === 'User' && onboardingPath === undefined)) && !isGuestMode && !isPublicRoute && !isOnboardingRoute && !isGuestAllowedRoute) {
        return createElement(RouteLoadingShell);
    }

    if (!resolvedUser && !isGuestMode && !isPublicRoute && !isGuestAllowedRoute) {
        return createElement(RouteLoadingShell);
    }

    if (shouldAutoRedirect && redirectPath) {
        return createElement(RouteLoadingShell);
    }

    return createElement(
        Fragment,
        null,
        createElement(Outlet),
        createElement(GuestLoginModal, {
            isOpen: isGuestLoginOpen,
            onClose: () => setIsGuestLoginOpen(false),
            title: 'Login required',
            message: 'This page is available to signed-in members. Log in or create an account to continue.',
        }),
    );
}