'use client';

import type { MapEvent, MapPlace } from '@family/shared';
import { EventMapMarkerPreview } from './event-map-marker';
import { Link } from '@/i18n/navigation';
import { Button, Card } from '@/components/ui';

interface PlaceInsightPanelProps {
  event: MapEvent | null;
  place: MapPlace | null;
  personLabel?: string | null;
  onClose: () => void;
  onOpenTimeline?: (personId: string) => void;
  onOpen3DTree?: (personId: string) => void;
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <p className="text-[10px] uppercase tracking-[0.25em] text-amber-700/80 dark:text-amber-300/80">Place insight</p>
      <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700" aria-label="Close">
        ✕
      </button>
    </div>
  );
}

export function PlaceInsightPanel({
  event,
  place,
  personLabel,
  onClose,
  onOpenTimeline,
  onOpen3DTree,
}: PlaceInsightPanelProps) {
  if (!event && !place) return null;

  const personId = event?.personId ?? place?.personIds[0] ?? null;

  return (
    <Card className="absolute bottom-4 left-4 z-10 max-w-sm border-amber-200/60 bg-[#f7f0df]/95 p-4 shadow-xl backdrop-blur dark:border-amber-900/40 dark:bg-slate-900/95">
      <PanelHeader onClose={onClose} />
      {event ? (
        <div>
          <div className="flex items-start gap-3">
            <EventMapMarkerPreview event={event} />
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-800/70 dark:text-amber-200/70">{event.type}</p>
              <h3 className="font-serif text-lg font-semibold text-family-ink dark:text-amber-50">{event.title}</h3>
            </div>
          </div>
          <dl className="mt-3 space-y-1 text-sm text-stone-600 dark:text-slate-300">
            {event.year != null && (
              <div className="flex gap-2">
                <dt className="text-stone-400">Year</dt>
                <dd>{event.year}</dd>
              </div>
            )}
            {event.placeName && (
              <div className="flex gap-2">
                <dt className="text-stone-400">Place</dt>
                <dd>{event.placeName}</dd>
              </div>
            )}
            {personLabel && (
              <div className="flex gap-2">
                <dt className="text-stone-400">Person</dt>
                <dd>{personLabel}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : place ? (
        <div>
          <h3 className="font-serif text-lg font-semibold text-family-ink dark:text-amber-50">
            {place.displayName ?? place.name}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {[place.city, place.region, place.country].filter(Boolean).join(', ')}
          </p>
          <p className="mt-2 text-xs text-stone-400">
            Events: {place.eventIds.length} · People: {place.personIds.length}
          </p>
        </div>
      ) : null}

      {personId && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onOpenTimeline && (
            <Button variant="secondary" className="text-xs" onClick={() => onOpenTimeline(personId)}>
              Timeline
            </Button>
          )}
          {onOpen3DTree && (
            <Button variant="secondary" className="text-xs" onClick={() => onOpen3DTree(personId)}>
              3D Tree
            </Button>
          )}
          <Link href={`/persons/${personId}`} className="text-xs text-family-primary underline dark:text-family-accent">
            Profile
          </Link>
        </div>
      )}
    </Card>
  );
}
