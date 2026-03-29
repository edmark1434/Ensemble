import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true, // Include cookies in requests
});


api.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
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
                        localStorage.setItem('accessToken', newAccessToken);
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