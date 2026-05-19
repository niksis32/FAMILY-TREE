'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@family.local');
  const [password, setPassword] = useState('family-demo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    await login({ email, password });
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.2),transparent_35%),linear-gradient(135deg,#f8f6f3,#edf2f7)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.2),transparent_35%),linear-gradient(135deg,#020617,#111827)]">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-family-accent">Family Memory</p>
        <h1 className="mt-4 text-3xl font-semibold text-family-ink dark:text-white">Вход в архив семьи</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          MVP поддерживает локальную demo-сессию. Когда backend auth будет готов, форма начнёт использовать реальный JWT.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Входим...' : 'Войти'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
