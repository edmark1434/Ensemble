import axios from "axios";
import { API_BASE_URL } from "./api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
                    { withCredentials: true }
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

        return Promise.reject(err);
        }
    );


export default api;