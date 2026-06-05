import { API_PREFIX } from '@family/shared';

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Browser on VPS/nginx: same-origin. Local dev: localhost:4000. SSR: internal Docker URL. */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (isLocalHostname(hostname)) {
      return fromEnv ?? `http://localhost:4000${API_PREFIX}`;
    }
    return `${window.location.origin}${API_PREFIX}`;
  }

  if (fromEnv && !fromEnv.includes('localhost') && !fromEnv.includes('127.0.0.1')) {
    return fromEnv;
  }

  const internal = process.env.API_INTERNAL_URL?.trim();
  if (internal) return internal;

  return fromEnv ?? `http://localhost:4000${API_PREFIX}`;
}
