import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, tokenStorage, APIResponse } from '../lib/api';
import { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setIsLoading(false);
      return;
    }
    try {
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
    const res = await api.post<APIResponse<{ user: AuthUser; accessToken: string; refreshToken: string }>>('/auth/login', {
      email,
      password,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Login failed');
    }
    const { user: loggedInUser, accessToken, refreshToken } = res.data.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    setUser(loggedInUser);
  };

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
    window.location.href = '/login';
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
