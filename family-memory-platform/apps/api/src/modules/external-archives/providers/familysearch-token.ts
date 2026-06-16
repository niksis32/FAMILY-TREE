type FamilySearchTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let cached: FamilySearchTokenCache | null = null;

export async function resolveFamilySearchAccessToken(): Promise<string | null> {
  const staticKey = process.env.FAMILYSEARCH_API_KEY?.trim();
  if (staticKey) return staticKey;

  const username = process.env.FAMILYSEARCH_USERNAME?.trim();
  const password = process.env.FAMILYSEARCH_PASSWORD?.trim();
  if (!username || !password) return null;

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password,
  });

  const response = await fetch('https://ident.familysearch.org/cis-web/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) return null;

  cached = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return cached.accessToken;
}

export function resetFamilySearchTokenCache() {
  cached = null;
}
