'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import type { AuthInfo, ProfileResponse } from '@/types/auth';
import type { PermissionValue } from '@/constants/permission';

interface AuthContextValue extends AuthInfo {
  loading: boolean;
  refreshAuth: () => Promise<void>;
  clearAuth: () => void;
  hasPermission: (permission: PermissionValue) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultAuthInfo: AuthInfo = {
  user: null,
  role: null,
  permissions: [],
};

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [authInfo, setAuthInfo] = useState<AuthInfo>(defaultAuthInfo);
  const [loading, setLoading] = useState(true);
  const authLoadedRef = useRef(false);

  const clearAuth = useCallback(() => {
    setAuthInfo(defaultAuthInfo);
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        clearAuth();
        return;
      }

      const result: ProfileResponse = await response.json();

      if (result.code !== 0 || !result.data) {
        clearAuth();
        return;
      }

      setAuthInfo(result.data);
    } catch (error) {
      console.error('refreshAuth error:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/register') {
      clearAuth();
      setLoading(false);
      return;
    }

    if (authLoadedRef.current) {
      return;
    }

    authLoadedRef.current = true;
    refreshAuth();
  }, [clearAuth, pathname, refreshAuth]);

  const hasPermission = useCallback(
    (permission: PermissionValue) => {
      return authInfo.permissions.includes(permission);
    },
    [authInfo.permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authInfo,
      loading,
      refreshAuth,
      clearAuth,
      hasPermission,
    }),
    [authInfo, loading, refreshAuth, clearAuth, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext 必须在 AuthProvider 内使用');
  }

  return context;
}
