import axios from "axios";
import { getToken, removeToken } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      removeToken();
      // Outside React, so a hard navigation is the only option; it also drops any in-memory state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/signup";
    }
    return Promise.reject(error);
  },
);

export default api;
