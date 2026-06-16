import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'whsec_';

export function generateWebhookSecret(): { raw: string; hash: string; prefix: string } {
  const body = randomBytes(24).toString('base64url');
  const raw = `${PREFIX}${body}`;
  return {
    raw,
    hash: hashWebhookSecret(raw),
    prefix: raw.slice(0, 12),
  };
}

export function hashWebhookSecret(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function encryptWebhookSecret(raw: string, encryptionKey: string): string {
  const key = createHash('sha256').update(encryptionKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptWebhookSecret(secretEnc: string, encryptionKey: string): string {
  const buf = Buffer.from(secretEnc, 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const key = createHash('sha256').update(encryptionKey).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
