'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border bg-white p-4 shadow-lg dark:bg-slate-900">
      <p className="text-sm font-medium">Установить Family Memory</p>
      <p className="mt-1 text-xs text-stone-500">Быстрый доступ с домашнего экрана и офлайн-режим</p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            setDismissed(true);
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Установить
        </Button>
        <Button type="button" variant="ghost" onClick={() => setDismissed(true)}>
          Позже
        </Button>
      </div>
    </div>
  );
}
