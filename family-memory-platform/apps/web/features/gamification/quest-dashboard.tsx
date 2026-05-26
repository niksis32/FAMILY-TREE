'use client';

import type { QuestInstance, WeeklyGoalSet } from '@family/shared';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface QuestDashboardProps {
  quests: QuestInstance[];
  weeklyGoals: WeeklyGoalSet;
}

function QuestRow({ quest }: { quest: QuestInstance }) {
  const t = useTranslations('gamification');
  const percent = quest.target > 0 ? Math.round((quest.progress / quest.target) * 100) : 0;

  const statusTone =
    quest.status === 'completed' ? 'green' : quest.status === 'in_progress' ? 'gold' : 'muted';

  const titleKey = quest.titleKey.replace('gamification.', '');
  const descriptionKey = quest.descriptionKey.replace('gamification.', '');

  return (
    <div className="rounded-2xl border bg-white/70 p-4 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t(`categories.${quest.category}`)}</p>
          <h3 className="mt-1 font-medium text-family-ink dark:text-white">{t(titleKey as never)}</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t(descriptionKey as never)}</p>
        </div>
        <Badge tone={statusTone}>{t(`status.${quest.status}`)}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
          <div className="h-full bg-family-accent" style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
        <span className="text-xs font-semibold text-stone-600 dark:text-slate-300">
          {quest.progress}/{quest.target}
        </span>
      </div>
    </div>
  );
}

export function QuestDashboard({ quests, weeklyGoals }: QuestDashboardProps) {
  const t = useTranslations('gamification.questDashboard');

  const activeQuests = quests.filter((q) => q.status !== 'completed').slice(0, 8);
  const completedCount = quests.filter((q) => q.status === 'completed').length;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('weeklyEyebrow')}</p>
            <h2 className="font-serif text-xl font-semibold">{t('weeklyTitle')}</h2>
          </div>
          <Badge tone="gold">{t('weekRange')}</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {weeklyGoals.goals.map((goal) => (
            <QuestRow key={`weekly-${goal.questId}`} quest={goal} />
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('activeEyebrow')}</p>
            <h2 className="font-serif text-xl font-semibold">{t('activeTitle')}</h2>
          </div>
          <span className={cn('text-sm text-stone-500')}>{t('completedCount', { count: completedCount })}</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {activeQuests.map((quest) => (
            <QuestRow key={quest.questId} quest={quest} />
          ))}
        </div>
      </Card>
    </div>
  );
}
