import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

export function getAdminHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAdminSession() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
}

export function saveAdminSession(payload) {
  if (payload?.token) {
    localStorage.setItem("admin_token", payload.token);
  }
  if (payload?.admin) {
    localStorage.setItem("admin_user", JSON.stringify(payload.admin));
  }
}

export async function adminGet(url, config = {}) {
  return axios.get(url, {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...getAdminHeaders(),
    },
  });
}

export async function adminPost(url, data = {}, config = {}) {
  return axios.post(url, data, {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...getAdminHeaders(),
    },
  });
}

export async function adminPut(url, data = {}, config = {}) {
  return axios.put(url, data, {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...getAdminHeaders(),
    },
  });
}

export async function adminPatch(url, data = {}, config = {}) {
  return axios.patch(url, data, {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...getAdminHeaders(),
    },
  });
}

export function isAdminAuthError(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}