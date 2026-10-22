import axios from "axios";
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n/languages';
import { useAuthStore } from "../store/authStore";
import { usePlatformAuthStore } from "../store/platformAuthStore";

const fetch = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

let csrfToken = "";

async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const csrfUrl = baseUrl.endsWith("/") ? `${baseUrl}auth/csrf` : `${baseUrl}/auth/csrf`;
  const res = await axios.get(csrfUrl, { withCredentials: true });
  csrfToken = res.data?.data?.csrfToken || res.data?.csrfToken || "";
  return csrfToken;
}

fetch.interceptors.request.use(async (config) => {
  const language = normalizeLanguage(
    i18n.language || localStorage.getItem("language") || DEFAULT_LANGUAGE
  );

  config.headers["Accept-Language"] = language;

  const method = (config.method || "get").toUpperCase();
  const url = config.url || "";
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && !url.includes("auth/csrf")) {
    config.headers["X-CSRF-Token"] = await ensureCsrf();
  }

  if (!(config.data instanceof FormData)) {
    config.params = {
      ...config.params,
      lang: language,
    };

    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

fetch.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isPlatform = url.includes("platform/");
    const isAuthRoute = url.includes("auth/check")
      || url.includes("auth/refresh")
      || url.includes("auth/login")
      || url.includes("platform/auth/login")
      || url.includes("platform/auth/refresh")
      || url.includes("platform/auth/check");

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => fetch(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const refreshPath = isPlatform ? "platform/auth/refresh" : "auth/refresh";
        const refreshUrl = baseUrl.endsWith('/') ? `${baseUrl}${refreshPath}` : `${baseUrl}/${refreshPath}`;
        const csrf = await ensureCsrf();
        await axios.post(
          refreshUrl,
          {},
          { withCredentials: true, headers: { 'X-CSRF-Token': csrf } }
        );

        isRefreshing = false;
        processQueue(null);

        return fetch(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        if (isPlatform) usePlatformAuthStore.getState().clearAuth();
        else useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !url.includes("auth/login") && !url.includes("platform/auth/login")) {
      if (isPlatform) usePlatformAuthStore.getState().clearAuth();
      else useAuthStore.getState().clearAuth();
    }

    return Promise.reject(error);
  }
);

export default fetch;
