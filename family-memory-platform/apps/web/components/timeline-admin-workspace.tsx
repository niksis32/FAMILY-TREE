'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, Input, Select, Textarea } from '@/components/ui';
import { apiClient, type EventRecord, type PlaceRecord } from '@/lib/api-client';

export function TimelineAdminWorkspace() {
  const { session } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [eventForm, setEventForm] = useState({ type: 'CUSTOM', date: '', personId: '', familyId: '', placeId: '', description: '' });
  const [placeForm, setPlaceForm] = useState({ name: '', country: '', region: '', city: '' });
  const [status, setStatus] = useState('Загружаем events и places...');
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    try {
      const [nextEvents, nextPlaces] = await Promise.all([
        apiClient.events.list(session?.accessToken),
        apiClient.places.list(session?.accessToken),
      ]);
      setEvents(nextEvents);
      setPlaces(nextPlaces);
      setStatus(`Событий: ${nextEvents.length}, мест: ${nextPlaces.length}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось загрузить timeline data');
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
      setEventForm({ type: 'CUSTOM', date: '', personId: '', familyId: '', placeId: '', description: '' });
      await load();
      setStatus('Событие создано');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать событие');
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
          country: placeForm.country || undefined,
          region: placeForm.region || undefined,
          city: placeForm.city || undefined,
        },
        session?.accessToken,
      );
      setPlaceForm({ name: '', country: '', region: '', city: '' });
      await load();
      setStatus('Место создано и отправлено на индексацию поиска');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать место');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Event CRUD</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createEvent}>
            <Select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>
              {['BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 'BURIAL', 'RESIDENCE', 'MIGRATION', 'EDUCATION', 'MILITARY', 'WORK', 'OCCUPATION', 'IMMIGRATION', 'CUSTOM'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input type="date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} />
            <Input value={eventForm.personId} onChange={(event) => setEventForm({ ...eventForm, personId: event.target.value })} placeholder="Person ID" />
            <Input value={eventForm.familyId} onChange={(event) => setEventForm({ ...eventForm, familyId: event.target.value })} placeholder="Family ID" />
            <Input value={eventForm.placeId} onChange={(event) => setEventForm({ ...eventForm, placeId: event.target.value })} placeholder="Place ID" />
            <Textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} placeholder="Описание события" />
            <Button className="md:col-span-2" disabled={isSaving || !session} type="submit">
              Создать событие
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Place CRUD</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createPlace}>
            <Input value={placeForm.name} onChange={(event) => setPlaceForm({ ...placeForm, name: event.target.value })} placeholder="Название места" required />
            <Input value={placeForm.country} onChange={(event) => setPlaceForm({ ...placeForm, country: event.target.value })} placeholder="Страна" />
            <Input value={placeForm.region} onChange={(event) => setPlaceForm({ ...placeForm, region: event.target.value })} placeholder="Регион" />
            <Input value={placeForm.city} onChange={(event) => setPlaceForm({ ...placeForm, city: event.target.value })} placeholder="Город" />
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
                <p className="font-semibold">{event.type}</p>
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
                <p className="mt-1 text-stone-500 dark:text-slate-400">{[place.country, place.region, place.city].filter(Boolean).join(', ') || place.id}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
