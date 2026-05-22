'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { RelationshipFields } from '@/components/relationship-fields';
import { Button, Card, EmptyState, FormField, Input, Textarea } from '@/components/ui';
import { apiClient, type FamilyRecord, type RelationshipRecord } from '@/lib/api-client';
import {
  buildRelationshipCreates,
  emptyRelationshipDraft,
  isRelationshipDraftFilled,
  type RelationshipDraft,
} from '@/lib/relationship-draft';
import { useFormatApiError } from '@/lib/use-format-api-error';

export function FamiliesWorkspace() {
  const router = useRouter();
  const { session } = useAuth();
  const t = useTranslations('familiesWorkspace');
  const tCommon = useTranslations('common');
  const formatApiError = useFormatApiError();
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [familyForm, setFamilyForm] = useState({ name: '', notes: '' });
  const [relationshipForm, setRelationshipForm] = useState<RelationshipDraft>(emptyRelationshipDraft());
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setStatus(t('loadingBackend'));
    try {
      const [nextFamilies, nextRelationships] = await Promise.all([
        apiClient.families.list(session?.accessToken),
        apiClient.relationships.list(session?.accessToken),
      ]);
      setFamilies(nextFamilies);
      setRelationships(nextRelationships);
      setStatus(t('stats', { families: nextFamilies.length, relationships: nextRelationships.length }));
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const created = await apiClient.families.create(
        { name: familyForm.name || undefined, notes: familyForm.notes || undefined },
        session?.accessToken,
      );
      setFamilyForm({ name: '', notes: '' });
      setStatus(t('familyCreated'));
      router.push(`/families/${created.id}`);
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function createRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payloads = buildRelationshipCreates(relationshipForm);
      if (payloads.length === 0) {
        setStatus(t('fillRelationship'));
        return;
      }
      for (const payload of payloads) {
        await apiClient.relationships.create(payload, session?.accessToken);
      }
      setRelationshipForm(emptyRelationshipDraft());
      await load();
      setStatus(payloads.length > 1 ? t('relationshipsCreated', { count: payloads.length }) : t('relationshipCreated'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">{t('createFamily')}</h2>
          <form className="mt-5 space-y-4" onSubmit={createFamily}>
            <FormField label={t('name')}>
              <Input
                value={familyForm.name}
                onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })}
                placeholder={t('namePh')}
              />
            </FormField>
            <FormField label={t('notes')}>
              <Textarea
                value={familyForm.notes}
                onChange={(event) => setFamilyForm({ ...familyForm, notes: event.target.value })}
                placeholder={t('notesPh')}
              />
            </FormField>
            <Button disabled={isSaving || !session} type="submit">
              {t('createFamilyBtn')}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">{t('relationshipTitle')}</h2>
          <form className="mt-5 space-y-4" onSubmit={createRelationship}>
            <RelationshipFields families={families} draft={relationshipForm} onChange={setRelationshipForm} disabled={isSaving || !session} />
            <Button disabled={isSaving || !session || !isRelationshipDraftFilled(relationshipForm)} type="submit">
              {t('createRelationship')}
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {families.length === 0 ? <EmptyState title={t('noFamiliesTitle')} description={t('noFamiliesDesc')} /> : null}
        {families.map((family) => (
          <Link
            key={family.id}
            href={`/families/${family.id}`}
            className="block rounded-3xl border bg-white/85 p-6 shadow-premium transition hover:-translate-y-0.5 hover:border-family-accent dark:bg-slate-900/80"
          >
            <h3 className="text-xl font-semibold">{family.name ?? tCommon('noTitle')}</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{family.notes ?? t('noNotes')}</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
              {tCommon('membersCount', { count: family.members?.length ?? 0 })}
            </p>
            <p className="mt-4 text-xs font-semibold text-family-primary dark:text-family-accent">{t('openProfile')}</p>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="text-xl font-semibold">{t('currentRelationships')}</h2>
        <div className="mt-4 grid gap-3">
          {relationships.length === 0 ? <p className="text-sm text-stone-500 dark:text-slate-400">{t('noRelationships')}</p> : null}
          {relationships.map((relationship) => (
            <div key={relationship.id} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
              <p className="font-semibold">{relationship.type}</p>
              <p className="mt-1 text-stone-500 dark:text-slate-400">
                {relationship.fromPersonId} {'->'} {relationship.toPersonId}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
