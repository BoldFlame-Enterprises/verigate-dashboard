import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, tokenStorage, APIResponse } from '../lib/api';
import { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      if (!tokenStorage.getAccessToken()) {
        const refresh = await api.post<APIResponse<{ accessToken: string }>>('/auth/refresh');
        if (!refresh.data.data?.accessToken) throw new Error('No browser session');
        tokenStorage.setTokens(refresh.data.data.accessToken);
      }
      const res = await api.get<APIResponse<AuthUser>>('/users/me');
      setUser(res.data.data ?? null);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email: string, password: string) => {
    const res = await api.post<APIResponse<{ user: AuthUser; accessToken: string }>>('/auth/login', {
      email,
      password,
      client_kind: 'dashboard',
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Login failed');
    }
    const { user: loggedInUser, accessToken } = res.data.data;
    tokenStorage.setTokens(accessToken);
    setUser(loggedInUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenStorage.clear();
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
