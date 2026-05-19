import { API_PREFIX } from '@family/shared';

/**
 * Thin fetch wrapper for NestJS API.
 * Iteration: auth headers, error handling, React Query hooks.
 */
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_PREFIX}`;

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
