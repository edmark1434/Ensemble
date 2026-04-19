import { createElement, useEffect, useRef, useState } from "react";
import useGlobalState from "./global_state";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "./axios";

const STAFF_ROUTES: { [key: string]: string } = {
    'Admin': '/admin',
    'Support Moderator': '/moderator/support',
    'Jobs N Gigs Moderator': '/moderator/forum',
    'Forum Moderator': '/moderator/marketplace',
    'Dispute Moderator': '/moderator/dispute',
};

export default function StaffMiddleware() {
    const { user,setUser } = useGlobalState();
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const lastAllowedPathRef = useRef<string>("/");

    // Find which role is required for current route
    const requiredRole = Object.entries(STAFF_ROUTES).find(
        ([_, path]) => location.pathname.startsWith(path)
    )?.[0];

    const goToPreviousAllowedPath = (role?: string) => {
        const roleHome = role ? STAFF_ROUTES[role] : undefined;
        const fallbackPath =
            lastAllowedPathRef.current !== location.pathname
                ? lastAllowedPathRef.current
                : roleHome || "/";

        navigate(fallbackPath, { replace: true });
    };

    useEffect(() => {
        if (isAuthorized) {
            lastAllowedPathRef.current = location.pathname;
        }
    }, [isAuthorized, location.pathname]);

    useEffect(() => {
        // If no route-specific role requirement, allow access
        if (!requiredRole) {
            setIsAuthorized(true);
            return;
        }

        // If user exists and has the correct role, allow
        if (user?.type === 'Staff' && user?.role === requiredRole) {
            setIsAuthorized(true);
            return;
        }

        // If user exists but wrong role, deny and go back
        if (user?.type === 'Staff') {
            setIsAuthorized(false);
            goToPreviousAllowedPath(user.role);
            return;
        }

        // Non-staff users cannot access staff routes
        if (user && user.type !== 'Staff') {
            setIsAuthorized(false);
            goToPreviousAllowedPath();
            return;
        }

        // No user in state; check backend for staff status
        if (!user) {
            const checkStaffRole = async () => {
                try {
                    const response = await api.get('/api/staff/check-staff-role', {
                        withCredentials: true,
                    });

                    if (response.data.success && response.status === 200) {
                        const staffRole = response.data.role;
                        setUser(response.data.user); // Update user in global state with backend data
                        if (staffRole === requiredRole) {
                            setIsAuthorized(true);
                        } else {
                            setIsAuthorized(false);
                            goToPreviousAllowedPath(staffRole);
                        }
                    } else {
                        setIsAuthorized(false);
                        goToPreviousAllowedPath();
                    }
                } catch (err) {
                    setIsAuthorized(false);
                    goToPreviousAllowedPath();
                }
            };

            checkStaffRole();
        }
    }, [user, location.pathname, requiredRole, navigate]);

    // Avoid blank screen while role check is in progress
    if (isAuthorized === null) {
        return createElement(
            "div",
            {
                className:
                    "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
            },
            createElement(
                "div",
                {
                    className:
                        "flex min-w-[260px] flex-col items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 px-8 py-6 shadow-2xl",
                },
                createElement("div", {
                    className:
                        "h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent",
                }),
                createElement(
                    "div",
                    { className: "text-center" },
                    createElement("p", {
                        className: "text-sm font-medium text-white",
                        children: "Verifying access",
                    }),
                    createElement("p", {
                        className: "mt-1 text-xs text-zinc-300",
                        children: "Please wait a moment...",
                    })
                )
            )
        );
    }

    // Unauthorized path is immediately redirected to previous allowed path
    if (!isAuthorized) {
        return null;
    }

    // Render nested routes if authorized
    return createElement(Outlet);
}