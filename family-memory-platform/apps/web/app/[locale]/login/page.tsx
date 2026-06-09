'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const { login, completeMfaLogin } = useAuth();
  const [email, setEmail] = useState('admin@example.local');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('Family Platform Admin');
  const [mfaSessionToken, setMfaSessionToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('Введите JWT-учётные данные backend. Для нового стенда сначала создайте первого admin.');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus('Входим через backend JWT...');
    try {
      const result = await login({ email, password });
      if ('mfaRequired' in result && result.mfaRequired) {
        setMfaSessionToken(result.mfaSessionToken);
        setStatus('Введите код TOTP или recovery code.');
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось войти');
      setIsSubmitting(false);
    }
  }

  async function onMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaSessionToken) return;
    setIsSubmitting(true);
    setStatus('Проверяем MFA...');
    try {
      await completeMfaLogin(mfaSessionToken, mfaCode);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Неверный MFA код');
      setIsSubmitting(false);
    }
  }

  async function registerFirstAdmin() {
    setIsSubmitting(true);
    setStatus('Создаём первого администратора...');
    try {
      await apiClient.registerFirstAdmin({ email, password, displayName });
      await login({ email, password });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать первого администратора');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.2),transparent_35%),linear-gradient(135deg,#f8f6f3,#edf2f7)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.2),transparent_35%),linear-gradient(135deg,#020617,#111827)]">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-family-accent">Family Memory</p>
        <h1 className="mt-4 text-3xl font-semibold text-family-ink dark:text-white">Вход в архив семьи</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          Форма работает с реальным backend JWT. Demo fallback отключён, чтобы ошибки авторизации были видны сразу.
        </p>

        {mfaSessionToken ? (
          <form className="mt-8 space-y-4" onSubmit={onMfaSubmit}>
            <Input value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="TOTP или recovery code" />
            <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
            <Button className="w-full" disabled={isSubmitting || !mfaCode} type="submit">
              {isSubmitting ? 'Проверяем...' : 'Подтвердить MFA'}
            </Button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Имя первого администратора" />
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" />
            <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Входим...' : 'Войти'}
            </Button>
            <Button className="w-full" disabled={isSubmitting || !password} type="button" variant="secondary" onClick={() => void registerFirstAdmin()}>
              Создать первого admin
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
