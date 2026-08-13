import axios from "axios";
import { API_BASE_URL } from "./api";

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

const CSRF_EXEMPT_URL = /\/api\/users\/(?:login|signup|signup-save-session|verify-email|resend-verification-email|refresh-token|forgot-password)(?:$|[?#])/;

export function installDefaultAxiosCsrfInterceptor() {
  axios.interceptors.request.use(async (config) => {
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
  const method = String(config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
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
