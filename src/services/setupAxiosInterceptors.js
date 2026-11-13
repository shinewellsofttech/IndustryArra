import axios from "axios";
import { getAuthToken, isAuthEndpoint, handleSessionExpired } from "./AuthSessionManager";

let isInterceptorsConfigured = false;

/**
 * Attaches request and response interceptors to the global Axios instance.
 * - Injects 'Authorization: Bearer <token>' on all outgoing requests if not already set.
 * - Detects HTTP 401 Unauthorized responses and invokes the central handleSessionExpired handler.
 */
export const setupAxiosInterceptors = () => {
  if (isInterceptorsConfigured) {
    return;
  }
  isInterceptorsConfigured = true;

  // Request Interceptor
  axios.interceptors.request.use(
    (config) => {
      if (!config.headers) {
        config.headers = {};
      }

      // Check if Authorization header is already present (case-insensitive check)
      const existingAuth =
        config.headers["Authorization"] ||
        config.headers["authorization"] ||
        (typeof config.headers.get === "function" ? config.headers.get("Authorization") : null);

      if (!existingAuth) {
        const token = getAuthToken();
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      const status = error.response ? error.response.status : null;
      const requestUrl = error.config?.url || "";

      // If unauthorized and not an initial authentication call (like login), trigger auto-logout
      if (status === 401 && !isAuthEndpoint(requestUrl)) {
        handleSessionExpired(`AXIOS_401 from [${requestUrl}]`);
      }

      return Promise.reject(error);
    }
  );

  console.log("[setupAxiosInterceptors] Global Axios interceptors successfully initialized.");
};

// Auto-run once upon import
setupAxiosInterceptors();

export default setupAxiosInterceptors;

