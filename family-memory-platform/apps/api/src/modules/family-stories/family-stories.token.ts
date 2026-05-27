import { createHash, randomBytes } from 'node:crypto';

export function generatePublicStoryToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = hashPublicStoryToken(raw);
  return { raw, hash };
}

export function hashPublicStoryToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
