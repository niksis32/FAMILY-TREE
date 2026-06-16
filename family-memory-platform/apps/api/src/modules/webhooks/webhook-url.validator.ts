import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isIP } from 'node:net';

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80')) return true;
  return false;
}

export function isBlockedWebhookHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }
  if (isIP(host)) {
    if (isPrivateOrReservedIpv4(host) || isPrivateOrReservedIpv6(host)) {
      return true;
    }
  }
  return false;
}

export function validateWebhookTargetUrl(url: string, allowHttpLocal = process.env.NODE_ENV !== 'production'): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid webhook URL');
  }

  if (url.length > 2048) {
    throw new Error('Webhook URL exceeds maximum length of 2048 characters');
  }

  const isLocalHttp =
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]');

  if (parsed.protocol !== 'https:' && !(allowHttpLocal && isLocalHttp)) {
    throw new Error('Webhook URL must use HTTPS');
  }

  if (isBlockedWebhookHost(parsed.hostname)) {
    throw new Error('Webhook URL must not target private or local network addresses');
  }
}

@ValidatorConstraint({ name: 'IsSafeWebhookUrl', async: false })
export class IsSafeWebhookUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
      validateWebhookTargetUrl(value.trim());
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'url must be a valid HTTPS endpoint that is not a private or local address';
  }
}

export function IsSafeWebhookUrl(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeWebhookUrlConstraint,
    });
  };
}
