'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button, EmptyState } from '@/components/ui';

const ADMIN_ENTRY_KEY = 'family-admin-panel-confirmed';

export function AdminGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const t = useTranslations('adminPanel');
  const [entryConfirmed, setEntryConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    setEntryConfirmed(sessionStorage.getItem(ADMIN_ENTRY_KEY) === '1');
  }, []);

  if (!session?.accessToken) {
    return (
      <div className="space-y-4">
        <EmptyState title={t('loginRequiredTitle')} description={t('loginRequiredHint')} />
        <Link href="/login">
          <Button>{t('loginAction')}</Button>
        </Link>
      </div>
    );
  }

  if (session.user.role !== 'ADMIN') {
    return <EmptyState title={t('forbiddenTitle')} description={t('forbiddenHint')} />;
  }

  if (entryConfirmed === null) {
    return null;
  }

  function confirmEntry() {
    sessionStorage.setItem(ADMIN_ENTRY_KEY, '1');
    setEntryConfirmed(true);
  }

  function declineEntry() {
    router.push('/');
  }

  return (
    <>
      <ModalShell
        open={!entryConfirmed}
        onClose={declineEntry}
        title={t('entryConfirm.title')}
        subtitle={t('entryConfirm.subtitle')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={declineEntry}>
              {t('no')}
            </Button>
            <Button onClick={confirmEntry}>{t('yes')}</Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-stone-600 dark:text-slate-300">{t('entryConfirm.body')}</p>
      </ModalShell>
      {entryConfirmed ? children : null}
    </>
  );
}
