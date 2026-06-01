import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true, // Include cookies in requests
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
                    `${import.meta.env.VITE_BASE_URL}/api/users/refresh-token`,
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