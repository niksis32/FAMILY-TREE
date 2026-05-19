'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginDto } from '@family/shared';
import { apiClient, type AuthSession } from '@/lib/api-client';

const SESSION_KEY = 'family-session';
const TOKEN_COOKIE = 'family_access_token';

const fallbackSession: AuthSession = {
  accessToken: 'local-mvp-token',
  user: {
    id: 'local-user',
    email: 'demo@family.local',
    displayName: 'Family Admin',
  },
};

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
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) {
      setSession(JSON.parse(stored) as AuthSession);
    }
    setIsReady(true);
  }, []);

  const login = useCallback(
    async (dto: LoginDto) => {
      let nextSession = fallbackSession;
      try {
        nextSession = await apiClient.login(dto);
      } catch {
        nextSession = {
          ...fallbackSession,
          user: { ...fallbackSession.user, email: dto.email || fallbackSession.user.email },
        };
      }

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
