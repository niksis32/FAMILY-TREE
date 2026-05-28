import { createHash, randomBytes } from 'node:crypto';

export function generatePublicShareToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = hashPublicShareToken(raw);
  return { raw, hash };
}

export function hashPublicShareToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function hashClientIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}
