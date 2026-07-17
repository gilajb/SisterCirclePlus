import axios from "axios";
import { getToken, removeToken } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = "/signup";
    }
    return Promise.reject(error);
  }
);

export default api;
