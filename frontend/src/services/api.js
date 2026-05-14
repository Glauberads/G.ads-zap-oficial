import axios from "axios";

const baseURL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const openApi = axios.create({
  baseURL,
});

const getStoredToken = () => {
  const rawToken = localStorage.getItem("token");

  if (rawToken) {
    try {
      return JSON.parse(rawToken);
    } catch (error) {
      return String(rawToken).replace(/^"+|"+$/g, "");
    }
  }

  const rawUser = localStorage.getItem("user");

  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser);
      return (
        parsedUser?.token ||
        parsedUser?.accessToken ||
        parsedUser?.authToken ||
        ""
      );
    } catch (error) {
      return "";
    }
  }

  return "";
};

const setAuthorizationHeader = (headers, token) => {
  const authValue = `Bearer ${token}`;

  if (!headers) {
    return { Authorization: authValue };
  }

  if (typeof headers.set === "function") {
    headers.set("Authorization", authValue);
    return headers;
  }

  headers.Authorization = authValue;
  return headers;
};

// ============================================================
// Interceptors registrados UMA ÚNICA VEZ no nível do módulo
// ============================================================

let onUnauthorized = null;
export const setOnUnauthorized = (cb) => {
  onUnauthorized = cb;
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    config.headers = config.headers || {};

    if (token) {
      config.headers = setAuthorizationHeader(config.headers, token);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (originalRequest?.url?.includes("/auth/refresh_token")) {
      return Promise.reject(error);
    }

    if (
      error?.response?.status === 403 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers = setAuthorizationHeader(
              originalRequest.headers,
              token
            );
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh_token`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse?.data?.token;

        if (newToken) {
          localStorage.setItem("token", JSON.stringify(newToken));
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers = setAuthorizationHeader(
            originalRequest.headers,
            newToken
          );

          return api(originalRequest);
        }

        throw new Error("Refresh token retornou sem token.");
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("token");
        delete api.defaults.headers.common.Authorization;

        if (onUnauthorized) onUnauthorized();

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common.Authorization;

      if (onUnauthorized) onUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default api;