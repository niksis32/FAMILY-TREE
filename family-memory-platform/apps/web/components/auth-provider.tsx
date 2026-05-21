'use client';

import { useRouter } from '@/i18n/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginDto } from '@family/shared';
import { apiClient, type AuthSession } from '@/lib/api-client';

const SESSION_KEY = 'family-session';
const TOKEN_COOKIE = 'family_access_token';

const AuthContext = createContext<{
  session: AuthSession | null;
  isReady: boolean;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => void;
} | null>(null);

function persistSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  document.cookie = `${TOKEN_COOKIE}=${session.accessToken}; path=/; max-age=604800; SameSite=Lax`;
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (!stored) {
        if (!cancelled) setIsReady(true);
        return;
      }

      const parsed = JSON.parse(stored) as AuthSession;
      try {
        await apiClient.me(parsed.accessToken);
        if (!cancelled) setSession(parsed);
      } catch {
        clearSession();
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (dto: LoginDto) => {
      const nextSession = await apiClient.login(dto);
      persistSession(nextSession);
      setSession(nextSession);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    router.push('/login');
  }, [router]);

  const value = useMemo(() => ({ session, isReady, login, logout }), [isReady, login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
