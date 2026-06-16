'use client';

import { useEffect, useRef } from 'react';
import { REALTIME_EVENTS, type RealtimeEnvelope } from '@family/shared';
import { getApiBaseUrl } from '@/lib/api-base-url';

function getRealtimeOrigin() {
  return getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
}

export function useRealtime(options: {
  token?: string | null;
  workspaceId?: string | null;
  enabled?: boolean;
  onEvent?: (envelope: RealtimeEnvelope) => void;
}) {
  const handlerRef = useRef(options.onEvent);
  handlerRef.current = options.onEvent;

  useEffect(() => {
    if (!options.enabled || !options.token) return;

    let socket: import('socket.io-client').Socket | null = null;
    let cancelled = false;

    void (async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      socket = io(`${getRealtimeOrigin()}/realtime`, {
        auth: { token: options.token },
        query: options.workspaceId ? { workspaceId: options.workspaceId } : undefined,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        if (options.workspaceId) {
          socket?.emit('workspace.join', { workspaceId: options.workspaceId });
        }
      });

      for (const eventName of Object.values(REALTIME_EVENTS)) {
        socket.on(eventName, (envelope: RealtimeEnvelope) => {
          handlerRef.current?.(envelope);
        });
      }
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [options.token, options.workspaceId, options.enabled]);
}
