'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PersonCard } from '@/components/domain';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, FormField, Input, Select, Textarea } from '@/components/ui';
import { LocaleDateInput } from '@/components/locale-date-input';
import { PersonAttachmentsForm } from '@/components/person-attachments-form';
import { apiClient, ApiError } from '@/lib/api-client';
import { attachAssetsToPerson, emptyPersonAttachments, type PersonAttachmentDraft } from '@/lib/person-assets';
import { useFormatApiError } from '@/lib/use-format-api-error';
import type { PersonSummary } from '@family/shared';

const emptyForm = {
  givenName: '',
  patronymic: '',
  familyName: '',
  gender: 'UNKNOWN',
  birthDate: '',
  deathDate: '',
  privacyLevel: 'FAMILY',
  biography: '',
};

export function PersonsWorkspace() {
  const { session, logout } = useAuth();
  const t = useTranslations('personsWorkspace');
  const tCommon = useTranslations('common');
  const tGender = useTranslations('gender');
  const tPrivacy = useTranslations('privacy');
  const formatApiError = useFormatApiError();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<PersonAttachmentDraft>(emptyPersonAttachments);

  async function load() {
    setIsLoading(true);
    setStatus(t('loading'));
    try {
      const data = await apiClient.persons.list(session?.accessToken);
      setPersons(data);
      setStatus(data.length ? t('loaded', { count: data.length }) : t('emptyList'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(t('creating'));
    try {
      const created = await apiClient.persons.create(
        {
          ...form,
          patronymic: form.patronymic || undefined,
          familyName: form.familyName || undefined,
          birthDate: form.birthDate || undefined,
          deathDate: form.deathDate || undefined,
          biography: form.biography || undefined,
        },
        session?.accessToken,
      );

      const hasFiles =
        attachments.avatarFile || attachments.mediaFiles.length > 0 || attachments.documents.length > 0;

      if (hasFiles) {
        setStatus(t('uploadingAssets'));
        await attachAssetsToPerson(created.id, attachments, session?.accessToken);
      }

      setForm(emptyForm);
      setAttachments(emptyPersonAttachments());
      await load();
      setStatus(hasFiles ? t('createdWithAssets') : t('created'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
      <div className="space-y-4">
        <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
        {isLoading ? <EmptyState title={t('loadingTitle')} description={t('loadingDesc')} /> : null}
        {!isLoading && persons.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {persons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">{t('newPerson')}</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createPerson}>
          <FormField label={t('familyName')} className="md:col-span-2">
            <Input
              value={form.familyName}
              onChange={(event) => setForm({ ...form, familyName: event.target.value })}
              placeholder={t('familyNamePh')}
            />
          </FormField>
          <FormField label={t('givenName')}>
            <Input
              value={form.givenName}
              onChange={(event) => setForm({ ...form, givenName: event.target.value })}
              placeholder={t('givenNamePh')}
              required
            />
          </FormField>
          <FormField label={t('patronymic')}>
            <Input
              value={form.patronymic}
              onChange={(event) => setForm({ ...form, patronymic: event.target.value })}
              placeholder={t('patronymicPh')}
            />
          </FormField>
          <FormField label={t('gender')}>
            <Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
              <option value="UNKNOWN">{tGender('UNKNOWN')}</option>
              <option value="FEMALE">{tGender('FEMALE')}</option>
              <option value="MALE">{tGender('MALE')}</option>
              <option value="OTHER">{tGender('OTHER')}</option>
            </Select>
          </FormField>
          <FormField label={t('visibility')}>
            <Select value={form.privacyLevel} onChange={(event) => setForm({ ...form, privacyLevel: event.target.value })}>
              <option value="FAMILY">{tPrivacy('family')}</option>
              <option value="PUBLIC">{tPrivacy('public')}</option>
              <option value="PRIVATE">{tPrivacy('private')}</option>
            </Select>
          </FormField>
          <FormField label={t('birthDate')}>
            <LocaleDateInput
              value={form.birthDate}
              onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
            />
          </FormField>
          <FormField label={t('deathDate')}>
            <LocaleDateInput
              value={form.deathDate}
              onChange={(event) => setForm({ ...form, deathDate: event.target.value })}
            />
          </FormField>
          <FormField label={t('biography')} className="md:col-span-2">
            <Textarea
              value={form.biography}
              onChange={(event) => setForm({ ...form, biography: event.target.value })}
              placeholder={t('biographyPh')}
            />
          </FormField>
          <div className="md:col-span-2">
            <PersonAttachmentsForm draft={attachments} onChange={setAttachments} disabled={isSaving || !session} />
          </div>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => void load()}>
              {tCommon('refresh')}
            </Button>
            <Button disabled={isSaving || !session} type="submit">
              {isSaving ? tCommon('saving') : tCommon('create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
