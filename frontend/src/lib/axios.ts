import axios from "axios";
import { API_BASE_URL } from "./api";
import useGlobalState from "./global_state";
import { showErrorToast } from "@/components/utility/toast";
import {
  isStaffPreviewFrame,
  postToStaffPreviewParent,
  staffPreviewInteractedRecently,
  STAFF_PREVIEW_SESSION_MESSAGE,
} from "./staffPlatformView";
import { showStaffViewOnlyNotice } from "@/components/staff/StaffPlatformView";
import { authFailureHref } from "./consoleHosts";

const ACCOUNT_RESTRICTION_CODES = new Set([
  "ACCOUNT_DELETED",
]);

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get(`${API_BASE_URL}/api/csrf-token`, {
        withCredentials: true,
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((response) => {
        const token = response.data?.csrfToken;
        if (typeof token !== "string" || !token) throw new Error("Invalid CSRF token response");
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

const CSRF_EXEMPT_URL = /\/api\/(?:chat|users\/(?:login|signup|signup-save-session|verify-email|resend-verification-email|refresh-token|forgot-password|reset-password))(?:$|[?#])/;

/**
 * POSTs that only read or keep the session alive. Platform view needs them: the forum
 * discussion page loads its authors with list-of-details, and an access token lasts an hour.
 */
const STAFF_VIEW_ALLOWED_POST = /\/api\/users\/(?:refresh-token|list-of-details)(?:$|[?#])/;

function isStaffPlatformFrame() {
  return useGlobalState.getState().user?.type === "Staff" && isStaffPreviewFrame();
}

function rejectStaffPlatformWrite(config: { method?: string; url?: string }) {
  if (!isStaffPlatformFrame()) return null;
  const method = String(config.method || "get").toLowerCase();
  const url = String(config.url || "");
  const reading = method === "get" || method === "head" || method === "options";
  if (reading && !/\/download(?:$|[?#/])/i.test(url)) return null;
  if (method === "post" && STAFF_VIEW_ALLOWED_POST.test(url)) return null;
  // Background writes (read receipts and the like) fail quietly; a click gets an explanation.
  if (staffPreviewInteractedRecently()) showStaffViewOnlyNotice();
  return Promise.reject(Object.assign(new Error("Platform view is browse-only."), {
    code: "STAFF_VIEW_ONLY",
    config,
  }));
}

export function installDefaultAxiosCsrfInterceptor() {
  axios.interceptors.request.use(async (config) => {
    const blocked = rejectStaffPlatformWrite(config);
    if (blocked) return blocked;
    const method = String(config.method || "get").toLowerCase();
    const url = String(config.url || "");
    if (!["get", "head", "options"].includes(method) && !CSRF_EXEMPT_URL.test(url)) {
      config.headers.set("X-CSRF-Token", await getCsrfToken());
    }
    return config;
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use(async (config) => {
  const blocked = rejectStaffPlatformWrite(config);
  if (blocked) return blocked;
  const method = String(config.method || "get").toLowerCase();
  const url = String(config.url || "");
  if (!["get", "head", "options"].includes(method) && !CSRF_EXEMPT_URL.test(url)) {
    config.headers.set("X-CSRF-Token", await getCsrfToken());
  }
  return config;
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (err) => {
        const originalRequest = err.config;

        const restrictionCode = err?.response?.data?.code;
        if (restrictionCode === "ACCOUNT_SUSPENDED") {
            // Fixed id: repeated blocked actions replace this toast instead of stacking new ones.
            showErrorToast(
                err.response?.data?.message || "Your account is suspended. You can look around Ensemble. Actions stay off until this ends.",
                { id: "account-suspended" },
            );
            return Promise.reject(err);
        }

        if (restrictionCode === "FORUM_TIMEOUT") {
            // Fixed id: repeated blocked actions replace this toast instead of stacking new ones.
            showErrorToast(
                err.response?.data?.message || "You are timed out from the forums. You can read them, and you cannot post, comment, react, or change them.",
                { id: "forum-timeout" },
            );
            return Promise.reject(err);
        }

        if (
            restrictionCode === "ACCOUNT_BANNED" ||
            (restrictionCode === "ACCOUNT_LOCKED" && err.response?.data?.restriction?.blocked !== true)
        ) {
            const standing = err.response?.data?.restriction;
            const current = useGlobalState.getState().user;
            const locked = restrictionCode === "ACCOUNT_LOCKED";
            if (current && standing) {
                useGlobalState.getState().setUser({
                    ...current,
                    status: locked ? "Locked" : "Banned",
                    restriction: standing,
                });
            }
            if (!window.location.pathname.startsWith("/account/appeal")) {
                window.location.assign("/account/appeal");
            }
            return Promise.reject(err);
        }

        if (restrictionCode === "ACCOUNT_LOCKED") {
            window.dispatchEvent(new CustomEvent("ensemble:account-restricted", {
                detail: err.response.data,
            }));
            useGlobalState.getState().clearUser();
            useGlobalState.getState().setIsAuthenticated(false);
            return Promise.reject(err);
        }

        if (ACCOUNT_RESTRICTION_CODES.has(restrictionCode)) {
            window.dispatchEvent(new CustomEvent("ensemble:account-restricted", {
                detail: err.response.data,
            }));
            useGlobalState.getState().clearUser();
            useGlobalState.getState().setIsAuthenticated(false);
            return Promise.reject(err);
        }

        if (err?.response?.status === 401 && !originalRequest?._retry) {
            originalRequest._retry = true;
            try {
                const refreshResponse = await axios.post(
                    `${API_BASE_URL}/api/users/refresh-token`,
                    {},
                    {
                      withCredentials: true,
                      headers: { "ngrok-skip-browser-warning": "true" },
                    }
                );
                if (refreshResponse.status === 200) {
                    return api(originalRequest);
                }

                // Inside platform view the console owns sign-in; the frame only reports it.
                if (isStaffPlatformFrame()) {
                    postToStaffPreviewParent({ type: STAFF_PREVIEW_SESSION_MESSAGE });
                    return Promise.reject(err);
                }
                window.location.href = authFailureHref();
                return Promise.reject(err);
            } catch (refreshError) {
                if (isStaffPlatformFrame()) {
                    postToStaffPreviewParent({ type: STAFF_PREVIEW_SESSION_MESSAGE });
                }
                return Promise.reject(refreshError);
            }
        }

        if (err?.response?.status === 403 && err?.response?.data?.code === "CSRF_INVALID" && !originalRequest?._csrfRetry) {
            originalRequest._csrfRetry = true;
            csrfToken = null;
            originalRequest.headers.set("X-CSRF-Token", await getCsrfToken());
            return api(originalRequest);
        }

        return Promise.reject(err);
        }
    );


export default api;
