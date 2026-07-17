export interface AuthRequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export function parseDeviceLabel(userAgent?: string | null): string | null {
  if (!userAgent?.trim()) return null;
  const ua = userAgent.trim();
  const lower = ua.toLowerCase();

  let browser = 'Browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari';
  else if (lower.includes('opr/') || lower.includes('opera')) browser = 'Opera';

  let os = 'Unknown OS';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';

  return `${browser} · ${os}`;
}

export function extractAuthRequestMeta(request: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}): AuthRequestMeta {
  const forwarded = request.headers?.['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ipAddress = (forwardedIp?.split(',')[0]?.trim() || request.ip || undefined)?.slice(0, 64);
  const rawUa = request.headers?.['user-agent'];
  const userAgent = (Array.isArray(rawUa) ? rawUa[0] : rawUa)?.slice(0, 512);

  return { ipAddress, userAgent };
}
