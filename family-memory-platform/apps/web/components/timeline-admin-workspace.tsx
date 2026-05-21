'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, FormField, Input, Select, Textarea } from '@/components/ui';
import { apiClient, formatApiError, type EventRecord, type FamilyRecord, type PlaceRecord } from '@/lib/api-client';
import { API_EVENT_TYPE_OPTIONS, apiEventTypeLabel } from '@/lib/event-type-labels';
import { formatPersonLabel } from '@/lib/person-display';
import { buildCountryPeriodOptions, CENTURY_OPTIONS, citiesForCountry, formatPlaceOption } from '@/lib/place-helpers';
import type { PersonSummary } from '@family/shared';

export function TimelineAdminWorkspace() {
  const { session } = useAuth();
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
  const [placeForm, setPlaceForm] = useState({
    name: '',
    century: '',
    countryPeriod: '',
    city: '',
  });
  const [status, setStatus] = useState('Загружаем события и места...');
  const [isSaving, setIsSaving] = useState(false);

  const surnames = useMemo(() => {
    const set = new Set<string>();
    for (const person of persons) {
      const name = person.familyName?.trim();
      if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [persons]);

  const countryPeriodOptions = useMemo(
    () => buildCountryPeriodOptions(places, placeForm.century),
    [places, placeForm.century],
  );

  const cityOptions = useMemo(
    () => citiesForCountry(places, placeForm.countryPeriod),
    [places, placeForm.countryPeriod],
  );

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
      setStatus(`Событий: ${nextEvents.length}, мест: ${nextPlaces.length}`);
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

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
      setEventForm({ type: 'BIRTH', date: '', personId: '', familyId: '', placeId: '', description: '' });
      await load();
      setStatus('Событие создано');
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
      const countryStored = placeForm.countryPeriod || undefined;
      await apiClient.places.create(
        {
          name: placeForm.name,
          country: countryStored,
          city: placeForm.city || undefined,
        },
        session?.accessToken,
      );
      setPlaceForm({ name: '', century: '', countryPeriod: '', city: '' });
      await load();
      setStatus('Место создано и отправлено на индексацию поиска');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  function onCenturyChange(century: string) {
    setPlaceForm((current) => ({
      ...current,
      century,
      countryPeriod: '',
      city: '',
    }));
  }

  function onCountryPeriodChange(countryPeriod: string) {
    setPlaceForm((current) => ({
      ...current,
      countryPeriod,
      city: '',
    }));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Событие</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createEvent}>
            <FormField label="Тип события">
              <Select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>
                {API_EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Дата">
              <Input type="date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} />
            </FormField>
            <FormField label="Персона">
              <Select value={eventForm.personId} onChange={(event) => setEventForm({ ...eventForm, personId: event.target.value })}>
                <option value="">Не выбрано</option>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {formatPersonLabel(person)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Семья / фамилия">
              <Select value={eventForm.familyId} onChange={(event) => setEventForm({ ...eventForm, familyId: event.target.value })}>
                <option value="">Не выбрано</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name?.trim() || `Семья ${family.id.slice(0, 8)}`}
                  </option>
                ))}
                {surnames
                  .filter((surname) => !families.some((family) => family.name?.trim() === surname))
                  .map((surname) => (
                    <option key={`surname-${surname}`} value="" disabled>
                      {surname} (создайте семью с этим названием)
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Место" className="md:col-span-2">
              <Select value={eventForm.placeId} onChange={(event) => setEventForm({ ...eventForm, placeId: event.target.value })}>
                <option value="">Не выбрано</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {formatPlaceOption(place)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Описание" className="md:col-span-2">
              <Textarea
                value={eventForm.description}
                onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })}
                placeholder="Описание события"
              />
            </FormField>
            <Button className="md:col-span-2" disabled={isSaving || !session} type="submit">
              Создать событие
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Место</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createPlace}>
            <FormField label="Название" className="md:col-span-2">
              <Input
                value={placeForm.name}
                onChange={(event) => setPlaceForm({ ...placeForm, name: event.target.value })}
                placeholder="Например: Казань, центр"
                required
              />
            </FormField>
            <FormField label="Век">
              <Select value={placeForm.century} onChange={(event) => onCenturyChange(event.target.value)}>
                {CENTURY_OPTIONS.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Страна (с периодом)">
              <Select
                value={placeForm.countryPeriod}
                onChange={(event) => onCountryPeriodChange(event.target.value)}
                disabled={countryPeriodOptions.length === 0}
              >
                <option value="">Не выбрано</option>
                {countryPeriodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Город" className="md:col-span-2">
              <Select
                value={placeForm.city}
                onChange={(event) => setPlaceForm({ ...placeForm, city: event.target.value })}
                disabled={!placeForm.countryPeriod}
              >
                <option value="">{placeForm.countryPeriod ? 'Не выбрано или новый город' : 'Сначала выберите страну'}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
              <Input
                className="mt-2"
                value={placeForm.city}
                onChange={(event) => setPlaceForm({ ...placeForm, city: event.target.value })}
                placeholder="Или введите новый город"
                disabled={!placeForm.countryPeriod}
              />
            </FormField>
            <Button className="md:col-span-2" disabled={isSaving || !session} type="submit">
              Создать место
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">События из API</h2>
          <div className="mt-4 space-y-3">
            {events.length === 0 ? <EmptyState title="Событий нет" description="Создайте первое событие через форму." /> : null}
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
                <p className="font-semibold">{apiEventTypeLabel(event.type)}</p>
                <p className="mt-1 text-stone-500 dark:text-slate-400">{event.description ?? event.date ?? event.id}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Места из API</h2>
          <div className="mt-4 space-y-3">
            {places.length === 0 ? <EmptyState title="Мест нет" description="Создайте первое место через форму." /> : null}
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
