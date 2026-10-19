import { createElement, Fragment, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import useGlobalState from "./global_state";
import api from "./axios";
import { getStaffHomePath, getStaffPlatformViewPath } from "./staffRoutes";
import { ONBOARDING_COMPLETED_EVENT, ONBOARDING_STEP_CHANGED_EVENT, wasOnboardingCompleted } from "./onboardingEvents";
import { ProfileLoadingState } from "@/pages/user/7_profile/Displays/ProfileLoadingState.tsx";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { isGuestAllowedPath } from "./guestRouteAccess";
import { isStaffConsolePath, isStaffPreviewFrame } from "./staffPlatformView";
import { isAppealLimitedMember } from "./appealAccess";

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

function isBannedMember(user: Parameters<typeof isAppealLimitedMember>[0]) {
    return isAppealLimitedMember(user);
}

function isBannedAllowedPath(pathname: string) {
    return pathname === '/account/access' || pathname === '/login';
}

function getRedirectPath(user: { type?: string; role?: string | null; status?: string; restriction?: { banned?: boolean; code?: string } } | null) {
    if (!user) {
        return null;
    }

    if (isBannedMember(user)) {
        return '/account/access';
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

    useEffect(() => {
        useGlobalState.getState().setIsLoading(isCheckingSession);
    }, [isCheckingSession]);
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
    const ticketFormPath = location.pathname.replace(/\/$/, '').toLowerCase();
    const isTicketFormRoute = ticketFormPath === '/support/ticket' || ticketFormPath === '/landing/submitaticket';
    const isPublicRoute =
        basePublicRoutes.includes(location.pathname) ||
        (location.pathname.startsWith('/landing/') && !isTicketFormRoute) ||
        location.search.includes('preview=true');
    const ticketLoginPath = `/login?redirect=${encodeURIComponent('/support/ticket')}`;
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
        if (isTicketFormRoute) {
            navigate(ticketLoginPath, { replace: true });
            return;
        }
        setIsGuestLoginOpen(true);
        navigate('/home', { replace: true });
    }, [isCheckingSession, isGuestAccessBlocked, isTicketFormRoute, ticketLoginPath, navigate]);

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
        if (resolvedUser.type !== 'User' || isBannedMember(resolvedUser)) {
            setOnboardingGate({
                accountId: resolvedUser.type === 'User' ? String(resolvedUser.account_id) : null,
                path: null,
                verificationFailed: false,
            });
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
            .catch((err: { response?: { data?: { code?: string } } }) => {
                if (cancelled) return;
                const code = err?.response?.data?.code;
                if (code === 'ACCOUNT_BANNED' || code === 'ACCOUNT_LOCKED') {
                    setOnboardingGate({ accountId, path: null, verificationFailed: false });
                    return;
                }
                setOnboardingGate({ accountId, path: undefined, verificationFailed: true });
            });
        return () => { cancelled = true; };
    }, [resolvedUser?.account_id, resolvedUser?.type, resolvedUser?.status, resolvedUser?.restriction?.code, resolvedUser?.restriction?.banned, resolvedUser?.restriction?.locked]);

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

        if (isBannedMember(resolvedUser)) {
            return '/account/access';
        }

        if (resolvedUser?.type === 'User' && onboardingPath === undefined) {
            return null;
        }

        return onboardingPath || getRedirectPath(resolvedUser);
    }, [isCheckingSession, isLocalSignOutTransition, resolvedUser, onboardingPath]);

    const shouldAutoRedirect = useMemo(() => {
        return basePublicRoutes.includes(location.pathname);
    }, [location.pathname]);

    useEffect(() => {
        if (!redirectPath || !shouldAutoRedirect) {
            return;
        }

        navigate(redirectPath, { replace: true });
    }, [navigate, redirectPath, shouldAutoRedirect]);

    useEffect(() => {
        if (location.search.includes('preview=true')) return;
        if (isBannedMember(resolvedUser)) return;
        if (isCheckingSession || onboardingPath === undefined || !resolvedUser || resolvedUser.type !== 'User') return;
        if (onboardingPath && location.pathname !== onboardingPath) {
            navigate(onboardingPath, { replace: true });
        } else if (!onboardingPath && isOnboardingRoute) {
            navigate('/home', { replace: true });
        }
    }, [isCheckingSession, onboardingPath, resolvedUser, isOnboardingRoute, location.pathname, location.search, navigate]);

    useEffect(() => {
        if (isCheckingSession || resolvedUser || isGuestMode || isPublicRoute || isGuestAllowedRoute) {
            return;
        }

        navigate(isTicketFormRoute ? ticketLoginPath : '/', { replace: true });
    }, [isCheckingSession, resolvedUser, isGuestMode, isPublicRoute, isGuestAllowedRoute, isTicketFormRoute, ticketLoginPath, navigate]);

    useEffect(() => {
        if (isCheckingSession || !isBannedMember(resolvedUser)) return;
        if (isBannedAllowedPath(location.pathname)) return;
        navigate('/account/access', { replace: true });
    }, [isCheckingSession, resolvedUser, location.pathname, navigate]);

    useEffect(() => {
        if (isCheckingSession || resolvedUser?.type !== 'Staff') return;
        if (isStaffPreviewFrame()) return;
        if (isPublicRoute || isTicketFormRoute || isStaffConsolePath(location.pathname) || isOnboardingRoute) return;
        navigate(getStaffPlatformViewPath(resolvedUser.role), { replace: true });
    }, [isCheckingSession, resolvedUser, isPublicRoute, isTicketFormRoute, isOnboardingRoute, location.pathname, navigate]);

    if (onboardingVerificationFailed && !isBannedMember(resolvedUser)) {
        return createElement(RouteLoadingShell);
    }

    if (isGuestAccessBlocked) {
        return createElement(RouteLoadingShell);
    }

    if ((isCheckingSession || (!isBannedMember(resolvedUser) && resolvedUser?.type === 'User' && onboardingPath === undefined)) && !isGuestMode && !isPublicRoute && !isOnboardingRoute && !isGuestAllowedRoute) {
        return createElement(RouteLoadingShell);
    }

    if (!resolvedUser && !isGuestMode && !isPublicRoute && !isGuestAllowedRoute) {
        return createElement(RouteLoadingShell);
    }

    if (isTicketFormRoute && !resolvedUser) {
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
