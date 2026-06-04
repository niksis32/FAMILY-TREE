'use client';

import type { MapEvent } from '@family/shared';
import { ColorDot } from '@family/ui';
import { eventMarkerColor, eventMarkerGlyph } from '@family/map-engine';

export function createEventMarkerElement(event: MapEvent, onClick: () => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'event-map-marker';
  el.title = `${event.title}${event.year ? ` (${event.year})` : ''}`;
  el.style.cssText = `
    display:flex;align-items:center;justify-content:center;
    width:28px;height:28px;border-radius:9999px;border:2px solid rgba(255,248,230,0.9);
    background:${eventMarkerColor(event.type)};color:#fff8e7;font-size:13px;font-weight:700;
    box-shadow:0 2px 8px rgba(43,32,18,0.35);cursor:pointer;
  `;
  el.textContent = eventMarkerGlyph(event.type);
  el.onclick = (e) => {
    e.stopPropagation();
    onClick();
  };
  return el;
}

export function EventMapMarkerPreview({ event }: { event: MapEvent }) {
  const color = eventMarkerColor(event.type);
  return (
    <span
      className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-amber-100 text-xs font-bold text-amber-50 shadow"
      aria-hidden
    >
      <ColorDot color={color} className="absolute inset-0 h-full w-full rounded-full" />
      <span className="relative z-10">{eventMarkerGlyph(event.type)}</span>
    </span>
  );
}
