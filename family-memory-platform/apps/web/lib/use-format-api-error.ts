'use client';

import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';

export function useFormatApiError() {
  const t = useTranslations('errors');

  return (error: unknown): string => {
    if (!(error instanceof ApiError)) {
      return error instanceof Error ? error.message : t('unknown');
    }
    try {
      const body = JSON.parse(error.message) as { message?: string | string[] };
      const msg = body.message;
      if (Array.isArray(msg)) return msg.join(', ');
      if (typeof msg === 'string') return msg;
    } catch {
      /* plain text */
    }
    if (error.status === 401) return t('sessionExpired');
    return error.message || t('apiError', { status: error.status });
  };
}
