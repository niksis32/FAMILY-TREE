import { API_PREFIX, type LoginDto, type PaginatedResponse, type PersonSummary } from '@family/shared';

/**
 * Thin API client for NestJS. It already carries auth/error semantics, while
 * backend CRUD can be connected incrementally without changing page code.
 */
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_PREFIX}`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message?: string,
  ) {
    super(message ?? `API ${status}: ${path}`);
    this.name = 'ApiError';
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  token?: string | null;
  body?: unknown;
};

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, body, headers, ...init } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new ApiError(res.status, path, message || undefined);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { token });
}

export function apiPost<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body, token });
}

export interface AuthSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export const apiClient = {
  login: (dto: LoginDto) => apiPost<AuthSession>('/auth/login', dto),
  persons: (token?: string | null) => apiGet<PaginatedResponse<PersonSummary>>('/persons', token),
};
