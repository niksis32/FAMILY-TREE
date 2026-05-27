'use client';

import type {
  FamilyStoryConfig,
  FamilyStoryCreateResultDto,
  FamilyStoryScopeTypeId,
  FamilyStoryTemplateId,
  StoryVisibilityLevel,
} from '@family/shared';
import { FAMILY_STORY_SCOPE_TYPES, STORY_VISIBILITY_LEVELS } from '@family/shared';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Input } from '@/components/ui';
import { StoryTemplateSelector } from './story-template-selector';
import { apiClient, formatApiError } from '@/lib/api-client';

const defaultConfig: FamilyStoryConfig = {
  sections: {
    timeline: { enabled: true, personIds: [] },
    map: { enabled: true, personId: null, familyId: null },
    media: { enabled: true, mediaIds: [] },
    documents: { enabled: false, documentIds: [] },
    narrative: { enabled: true },
    customBlocks: [],
  },
};

function visibilityToApi(v: StoryVisibilityLevel): string {
  if (v === 'family_only') return 'FAMILY_ONLY';
  return v.toUpperCase();
}

function scopeToApi(s: FamilyStoryScopeTypeId): string {
  return s === 'family_branch' ? 'FAMILY_BRANCH' : 'PERSON';
}

export function StoryBuilder({ storyId }: { storyId?: string }) {
  const t = useTranslations('familyStories');
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.accessToken;

  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<FamilyStoryTemplateId>('classic');
  const [visibility, setVisibility] = useState<StoryVisibilityLevel>('link_only');
  const [scopeType, setScopeType] = useState<FamilyStoryScopeTypeId>('person');
  const [scopePersonId, setScopePersonId] = useState('');
  const [scopeFamilyId, setScopeFamilyId] = useState('');
  const [hideLiving, setHideLiving] = useState(true);
  const [config, setConfig] = useState<FamilyStoryConfig>(defaultConfig);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !storyId) return;
    try {
      const story = await apiClient.familyStories.one(storyId, token);
      setTitle(story.title);
      setTemplate(story.template);
      setVisibility(story.visibility);
      setScopeType(story.scopeType);
      setScopePersonId(story.scopePersonId ?? '');
      setScopeFamilyId(story.scopeFamilyId ?? '');
      setHideLiving(story.hideLivingPersons);
      setConfig(story.config);
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [storyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!token || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        template: template.toUpperCase(),
        visibility: visibilityToApi(visibility),
        scopeType: scopeToApi(scopeType),
        scopePersonId: scopeType === 'person' ? scopePersonId.trim() : undefined,
        scopeFamilyId: scopeType === 'family_branch' ? scopeFamilyId.trim() : undefined,
        hideLivingPersons: hideLiving,
        config,
      };

      if (storyId) {
        await apiClient.familyStories.update(storyId, body, token);
        router.push('/stories');
      } else {
        const created = await apiClient.familyStories.create(body, token);
        if ('publicToken' in created) {
          const c = created as FamilyStoryCreateResultDto;
          setPublicLink(`${window.location.origin}/s/${c.publicToken}`);
        }
        router.push('/stories');
      }
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const generateNarrative = async () => {
    if (!token || !storyId) return;
    setBusy(true);
    try {
      await apiClient.familyStories.generateNarrative(storyId, { language: 'ru' }, token);
      await load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const rotateToken = async () => {
    if (!token || !storyId) return;
    setBusy(true);
    try {
      const res = await apiClient.familyStories.rotateToken(storyId, token);
      setPublicLink(`${window.location.origin}/s/${res.publicToken}`);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleSection = (key: keyof FamilyStoryConfig['sections'], enabled: boolean) => {
    if (key === 'customBlocks') return;
    setConfig((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: { ...prev.sections[key], enabled } },
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-family-ink dark:text-white">
          {storyId ? title || t('title') : t('newStory')}
        </h1>
        <p className="mt-2 text-stone-500">{t('subtitle')}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {publicLink ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium">{t('tokenOnce')}</p>
          <code className="mt-2 block break-all">{publicLink}</code>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">{t('visibility')}</span>
          <select
            className="w-full rounded-xl border px-3 py-2 dark:bg-slate-900"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as StoryVisibilityLevel)}
          >
            {STORY_VISIBILITY_LEVELS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Scope</span>
          <select
            className="w-full rounded-xl border px-3 py-2 dark:bg-slate-900"
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as FamilyStoryScopeTypeId)}
          >
            {FAMILY_STORY_SCOPE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {scopeType === 'person' ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('scopePerson')}</span>
            <Input value={scopePersonId} onChange={(e) => setScopePersonId(e.target.value)} placeholder="person cuid" />
          </label>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('scopeFamily')}</span>
            <Input value={scopeFamilyId} onChange={(e) => setScopeFamilyId(e.target.value)} placeholder="family cuid" />
          </label>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hideLiving} onChange={(e) => setHideLiving(e.target.checked)} />
        {t('hideLiving')}
      </label>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('template')}</h2>
        <StoryTemplateSelector value={template} onChange={setTemplate} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('sections')}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {(['timeline', 'map', 'media', 'documents', 'narrative'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.sections[key].enabled}
                onChange={(e) => toggleSection(key, e.target.checked)}
              />
              {t(key)}
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void save()} disabled={busy}>
          Save
        </Button>
        {storyId ? (
          <>
            <Button variant="secondary" onClick={() => void generateNarrative()} disabled={busy}>
              {t('generateNarrative')}
            </Button>
            <Button variant="secondary" onClick={() => void rotateToken()} disabled={busy}>
              {t('rotateToken')}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
