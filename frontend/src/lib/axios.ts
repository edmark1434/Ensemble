import axios from "axios";
import { API_BASE_URL } from "./api";
import useGlobalState from "./global_state";
import { showErrorToast } from "@/components/utility/toast";
import { isStaffBrowsePath } from "./staffPlatformView";

const ACCOUNT_RESTRICTION_CODES = new Set([
  "ACCOUNT_BANNED",
  "ACCOUNT_LOCKED",
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

function rejectStaffPlatformWrite(config: { method?: string; url?: string }) {
  if (useGlobalState.getState().user?.type !== "Staff") return null;
  if (!isStaffBrowsePath(window.location.pathname)) return null;
  const method = String(config.method || "get").toLowerCase();
  const url = String(config.url || "");
  const reading = method === "get" || method === "head" || method === "options";
  if (reading && !/\/download(?:$|[?#/])/i.test(url)) return null;
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
            showErrorToast(err.response?.data?.message || "Your account is suspended. You can view your account and notifications. Actions are turned off until this is lifted.");
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

                window.location.href = '/login';
                return Promise.reject(err);
            } catch (refreshError) {
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
