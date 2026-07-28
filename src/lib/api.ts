import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { coordinateSessionRefresh } from './sessionCoordinator';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let accessToken: string | null = null;
let csrfToken: string | null = null;

export const tokenStorage = {
  getAccessToken: () => accessToken,
  setTokens: (nextAccessToken: string, _refreshToken?: string) => {
    accessToken = nextAccessToken;
  },
  setCsrfToken: (nextCsrfToken: string) => {
    csrfToken = nextCsrfToken;
  },
  clear: () => {
    accessToken = null;
    csrfToken = null;
  },
};

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await coordinateSessionRefresh(async () => {
  try {
    if (!csrfToken) {
      const csrf = await axios.get(
        `${API_BASE_URL}/auth/csrf`,
        { withCredentials: true },
      );
      tokenStorage.setCsrfToken(csrf.data.data.csrfToken);
    }
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfToken },
      },
    );
    const {
      accessToken: nextAccessToken,
      csrfToken: nextCsrfToken,
    } = response.data.data;
    tokenStorage.setTokens(nextAccessToken);
    tokenStorage.setCsrfToken(nextCsrfToken);
    return { accessToken: nextAccessToken, csrfToken: nextCsrfToken };
  } catch {
    tokenStorage.clear();
    return null;
  }
  });
  if (tokens) {
    tokenStorage.setTokens(tokens.accessToken);
    tokenStorage.setCsrfToken(tokens.csrfToken);
  }
  return tokens?.accessToken ?? null;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export async function bootstrapBrowserSession(): Promise<string | null> {
  return refreshAccessToken();
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
