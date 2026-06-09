import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'family-mfa-v1', 32);
}

export function encryptSecret(plain: string, masterSecret: string): string {
  const key = deriveKey(masterSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(payload: string, masterSecret: string): string {
  const [version, ivHex, tagHex, dataHex] = payload.split(':');
  if (version !== 'v1' || !ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted secret format');
  }
  const key = deriveKey(masterSecret);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
