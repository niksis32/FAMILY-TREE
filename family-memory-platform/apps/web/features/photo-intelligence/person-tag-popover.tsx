'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PhotoFaceTagRecord } from '@family/shared';
import { Button, Card } from '@/components/ui';
import { getTagPeriodConfidence } from './period-confidence';
import type { PhotoInsightRecord } from '@family/shared';

interface PersonTagPopoverProps {
  tag: PhotoFaceTagRecord;
  takenAt?: string | null;
  insight?: PhotoInsightRecord | null;
  onEdit: () => void;
}

export function PersonTagPopover({ tag, takenAt, insight, onEdit }: PersonTagPopoverProps) {
  const t = useTranslations('photoIntelligence');
  const period = getTagPeriodConfidence(tag, takenAt, insight);

  if (!tag.person) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-500">{t('unassignedFace')}</p>
        <Button className="mt-3" onClick={onEdit}>
          {t('assignPerson')}
        </Button>
      </Card>
    );
  }

  const name = [tag.person.givenName, tag.person.patronymic, tag.person.familyName].filter(Boolean).join(' ');

  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-stone-400">{t('identifiedPerson')}</p>
      <h3 className="mt-1 text-lg font-semibold">{name}</h3>
      {period ? (
        <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
          {t('periodConfidence', { level: t(`confidence.${period.level}`) })}
          {period.photoYear ? ` · ${period.photoYear}` : ''}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/persons/${tag.person.id}`}>
          <Button variant="secondary">
            {t('openProfile')}
          </Button>
        </Link>
        <Button variant="ghost" onClick={onEdit}>
          {t('changePerson')}
        </Button>
      </div>
    </Card>
  );
}
