'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_APP_LOCALE, isAppLocale, type LoginDto } from '@family/shared';
import { apiClient, type AuthSession, type LoginResponse } from '@/lib/api-client';

function localeFromPathname(pathname: string | null): string {
  const segment = pathname?.split('/')[1]?.toLowerCase();
  return segment && isAppLocale(segment) ? segment : DEFAULT_APP_LOCALE;
}

const SESSION_KEY = 'family-session';
const TOKEN_COOKIE = 'family_access_token';

const AuthContext = createContext<{
  session: AuthSession | null;
  isReady: boolean;
  login: (dto: LoginDto) => Promise<LoginResponse>;
  completeMfaLogin: (mfaSessionToken: string, code: string) => Promise<void>;
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
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const pushWithLocale = useCallback(
    (path: string) => {
      const locale = localeFromPathname(pathname);
      const normalized = path.startsWith('/') ? path : `/${path}`;
      router.push(`/${locale}${normalized}`);
    },
    [pathname, router],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (!stored) {
        if (!cancelled) setIsReady(true);
        return;
      }

      let parsed: AuthSession;
      try {
        parsed = JSON.parse(stored) as AuthSession;
      } catch {
        clearSession();
        if (!cancelled) setIsReady(true);
        return;
      }

      if (!cancelled) setSession(parsed);

      try {
        await apiClient.me(parsed.accessToken);
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

  const login = useCallback(async (dto: LoginDto) => {
    const response = await apiClient.login(dto);
    if ('mfaRequired' in response && response.mfaRequired) {
      return response;
    }
    persistSession(response);
    setSession(response);
    pushWithLocale('/dashboard');
    return response;
  }, [pushWithLocale]);

  const completeMfaLogin = useCallback(
    async (mfaSessionToken: string, code: string) => {
      const nextSession = await apiClient.mfa.verify(mfaSessionToken, code);
      persistSession(nextSession);
      setSession(nextSession);
      pushWithLocale('/dashboard');
    },
    [pushWithLocale],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    pushWithLocale('/login');
  }, [pushWithLocale]);

  const value = useMemo(
    () => ({ session, isReady, login, completeMfaLogin, logout }),
    [isReady, login, completeMfaLogin, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
