import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { coordinateSessionRefresh } from './sessionCoordinator';

export function resolveApiBaseUrl(configured: string | undefined): string {
  const value = configured?.trim();
  if (!value) return '/api';

  if (value.startsWith('//')) {
    throw new Error('A same-origin API URL must use the explicit /api path');
  }
  if (value.startsWith('/')) {
    if (value.replace(/\/+$/, '') !== '/api') {
      throw new Error('A same-origin API URL must use the explicit /api path');
    }
    return '/api';
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_API_URL must be /api or an absolute API URL');
  }
  if (url.username || url.password) {
    throw new Error('VITE_API_URL must not contain credentials');
  }
  if (url.search || url.hash) {
    throw new Error('VITE_API_URL must not contain a query or fragment');
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('External VITE_API_URL values must use HTTPS');
  }
  if (url.pathname.replace(/\/+$/, '') !== '/api') {
    throw new Error('VITE_API_URL must end with /api');
  }
  return `${url.origin}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

export function createCorrelationId(
  randomUUID: () => string = () => globalThis.crypto.randomUUID()
): string {
  return randomUUID();
}

function configuredCorrelationId(config: InternalAxiosRequestConfig): string | undefined {
  const value = config.headers?.get?.('X-Correlation-Id');
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

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
  config.headers = config.headers || {};
  if (!configuredCorrelationId(config)) {
    config.headers['X-Correlation-Id'] = createCorrelationId();
  }
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(correlationId = createCorrelationId()): Promise<string | null> {
  const tokens = await coordinateSessionRefresh(async () => {
  try {
    if (!csrfToken) {
      const csrf = await axios.get(
        `${API_BASE_URL}/auth/csrf`,
        { withCredentials: true, headers: { 'X-Correlation-Id': correlationId } },
      );
      tokenStorage.setCsrfToken(csrf.data.data.csrfToken);
    }
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': csrfToken,
          'X-Correlation-Id': correlationId,
        },
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
      const correlationId = configuredCorrelationId(originalRequest) || createCorrelationId();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['X-Correlation-Id'] = correlationId;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken(correlationId).finally(() => {
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

export async function downloadAuthenticatedCsv(path: string, filename: string): Promise<void> {
  const token = tokenStorage.getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Correlation-Id': createCorrelationId(),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Export failed with status ${response.status}`);
  }
  if (!response.headers.get('content-type')?.includes('text/csv')) {
    throw new Error('Export response was not CSV');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  message?: string;
  request_id?: string;
  correlation_id?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
