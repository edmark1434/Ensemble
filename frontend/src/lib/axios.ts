import axios from "axios";
import useGlobalState from "@/lib/global_state";
const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true, // Include cookies in requests
});


api.interceptors.request.use(
    (config) => {
        const accessToken = useGlobalState.getState().accessToken;
        if(accessToken){
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
)

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (err) => {
        const originalRequest = err.config;
        if(err.response.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;
            try{
                const refreshResponse = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/users/refresh-token`, {}, { withCredentials: true });
                    if(refreshResponse.status === 200){
                        const newAccessToken = refreshResponse.data.accessToken;
                        useGlobalState.getState().setAccessToken(newAccessToken);
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        return axios(originalRequest);
                    } else {
                        window.location.href = '/login';
                        return Promise.reject(err);
                    }
                } catch (refreshError) {
                    return Promise.reject(refreshError);
                }
            } else {
                return Promise.reject(err);
            }
        }
);


export default api;