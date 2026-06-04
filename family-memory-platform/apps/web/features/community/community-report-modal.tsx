'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import { Button, FormField, Select, Textarea } from '@/components/ui';
import { apiClient, formatApiError, type ModerationReportCategory } from '@/lib/api-client';

const CATEGORIES: ModerationReportCategory[] = [
  'SPAM',
  'HARASSMENT',
  'PERSONAL_DATA_LIVING',
  'MISINFORMATION',
  'OFF_TOPIC',
  'COPYRIGHT',
  'OTHER',
];

export function CommunityReportModal({
  targetType,
  targetId,
  token,
  onClose,
  onSubmitted,
}: {
  targetType: string;
  targetId: string;
  token: string;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const t = useTranslations('community.report');
  const [category, setCategory] = useState<ModerationReportCategory>('OTHER');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await apiClient.community.createReport(
        {
          targetType,
          targetId,
          category,
          details: details.trim() || undefined,
        },
        token,
      );
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell open onClose={onClose} title={t('title')} size="md">
      {done ? (
        <p className="text-sm text-stone-700 dark:text-slate-300">{t('success')}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-slate-400">{t('hint')}</p>
          <FormField label={t('categoryLabel')}>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ModerationReportCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('details')}>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder={t('detailsPlaceholder')}
            />
          </FormField>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button variant="primary" type="button" disabled={busy} onClick={() => void submit()}>
              {t('submit')}
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
