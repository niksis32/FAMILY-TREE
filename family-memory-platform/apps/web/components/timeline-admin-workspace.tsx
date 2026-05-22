'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, FormField, Input, Select, Textarea } from '@/components/ui';
import { apiClient, type EventRecord, type FamilyRecord, type PlaceRecord } from '@/lib/api-client';
import { useApiEventTypeLabel, useApiEventTypeOptions } from '@/lib/use-event-type-labels';
import { useFormatApiError } from '@/lib/use-format-api-error';
import { formatPersonLabel } from '@/lib/person-display';
import { LocaleDateInput } from '@/components/locale-date-input';
import { PlaceGeographyForm, type PlaceGeographyValue } from '@/components/place-geography-form';
import { formatPlaceOption } from '@/lib/place-helpers';
import type { PersonSummary } from '@family/shared';

type TimelineAdminWorkspaceProps = {
  activePersonId?: string;
};

export function TimelineAdminWorkspace({ activePersonId = '' }: TimelineAdminWorkspaceProps) {
  const { session } = useAuth();
  const t = useTranslations('timelineAdmin');
  const tCommon = useTranslations('common');
  const formatApiError = useFormatApiError();
  const eventTypeOptions = useApiEventTypeOptions();
  const apiEventTypeLabel = useApiEventTypeLabel();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [eventForm, setEventForm] = useState({
    type: 'BIRTH',
    date: '',
    personId: '',
    familyId: '',
    placeId: '',
    description: '',
  });
  const emptyGeoForm = (): PlaceGeographyValue => ({
    century: '',
    countryId: '',
    regionId: '',
    cityId: '',
    name: '',
  });
  const [placeForm, setPlaceForm] = useState<PlaceGeographyValue>(emptyGeoForm());
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStatus(t('loading'));
  }, [t]);

  const surnames = useMemo(() => {
    const set = new Set<string>();
    for (const person of persons) {
      const name = person.familyName?.trim();
      if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [persons]);

  async function load() {
    try {
      const [nextEvents, nextPlaces, nextPersons, nextFamilies] = await Promise.all([
        apiClient.events.list(session?.accessToken),
        apiClient.places.list(session?.accessToken),
        apiClient.persons.list(session?.accessToken),
        apiClient.families.list(session?.accessToken),
      ]);
      setEvents(nextEvents);
      setPlaces(nextPlaces);
      setPersons(nextPersons);
      setFamilies(nextFamilies);
      setStatus(t('eventsPlacesCount', { events: nextEvents.length, places: nextPlaces.length }));
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  useEffect(() => {
    if (!activePersonId) return;
    setEventForm((current) => ({ ...current, personId: activePersonId }));
  }, [activePersonId]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.events.create(
        {
          type: eventForm.type,
          date: eventForm.date || undefined,
          personId: eventForm.personId || undefined,
          familyId: eventForm.familyId || undefined,
          placeId: eventForm.placeId || undefined,
          description: eventForm.description || undefined,
        },
        session?.accessToken,
      );
      setEventForm({
        type: 'BIRTH',
        date: '',
        personId: activePersonId || '',
        familyId: '',
        placeId: '',
        description: '',
      });
      await load();
      setStatus(t('eventCreated'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function createPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.places.create(
        {
          name: placeForm.name,
          latitude: placeForm.latitude,
          longitude: placeForm.longitude,
          country: placeForm.country,
          region: placeForm.region,
          city: placeForm.city,
          geoCountryId: placeForm.countryId || undefined,
          geoRegionId: placeForm.regionId || undefined,
          geoCityId: placeForm.cityId || undefined,
        },
        session?.accessToken,
      );
      setPlaceForm(emptyGeoForm());
      await load();
      setStatus(t('placeCreated'));
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
          <h2 className="text-xl font-semibold">{t('event')}</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createEvent}>
            <FormField label={t('eventType')}>
              <Select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>
                {eventTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('date')}>
              <LocaleDateInput
                value={eventForm.date}
                onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })}
              />
            </FormField>
            <FormField label={t('person')}>
              <Select value={eventForm.personId} onChange={(event) => setEventForm({ ...eventForm, personId: event.target.value })}>
                <option value="">{tCommon('notSelected')}</option>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {formatPersonLabel(person)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('familySurname')}>
              <Select value={eventForm.familyId} onChange={(event) => setEventForm({ ...eventForm, familyId: event.target.value })}>
                <option value="">{tCommon('notSelected')}</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name?.trim() || tCommon('familyFallback', { id: family.id.slice(0, 8) })}
                  </option>
                ))}
                {surnames
                  .filter((surname) => !families.some((family) => family.name?.trim() === surname))
                  .map((surname) => (
                    <option key={`surname-${surname}`} value="" disabled>
                      {tCommon('createFamilyHint', { name: surname })}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label={t('placeField')} className="md:col-span-2">
              <Select value={eventForm.placeId} onChange={(event) => setEventForm({ ...eventForm, placeId: event.target.value })}>
                <option value="">{tCommon('notSelected')}</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {formatPlaceOption(place)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('description')} className="md:col-span-2">
              <Textarea
                value={eventForm.description}
                onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })}
                placeholder={t('eventDescriptionPlaceholder')}
              />
            </FormField>
            <Button className="md:col-span-2" disabled={isSaving || !session} type="submit">
              {t('createEvent')}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">{t('place')}</h2>
          <form className="mt-5" onSubmit={createPlace}>
            <PlaceGeographyForm value={placeForm} onChange={setPlaceForm} disabled={isSaving || !session} />
            <Button className="mt-4 w-full" disabled={isSaving || !session || !placeForm.name.trim()} type="submit">
              {t('createPlace')}
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">{t('eventsFromApi')}</h2>
          <div className="mt-4 space-y-3">
            {events.length === 0 ? <EmptyState title={t('noEventsTitle')} description={t('noEventsDesc')} /> : null}
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
                <p className="font-semibold">{apiEventTypeLabel(event.type)}</p>
                <p className="mt-1 text-stone-500 dark:text-slate-400">{event.description ?? event.date ?? event.id}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">{t('placesFromApi')}</h2>
          <div className="mt-4 space-y-3">
            {places.length === 0 ? <EmptyState title={t('noPlacesTitle')} description={t('noPlacesDesc')} /> : null}
            {places.map((place) => (
              <div key={place.id} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
                <p className="font-semibold">{place.name}</p>
                <p className="mt-1 text-stone-500 dark:text-slate-400">
                  {[place.country, place.region, place.city].filter(Boolean).join(', ') || place.id}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
