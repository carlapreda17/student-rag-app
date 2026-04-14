import axios from "axios";

// URL-ul backend-ului FastAPI din .env
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: adaugă automat token-ul JWT la fiecare request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: dacă primim 401 (token expirat), delogăm userul
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      // forțează redirect la login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);