type ZipEntry = {
  entryName: string;
  isDirectory: boolean;
  getData(): Buffer;
};

type AdmZipCtor = new (buffer?: Buffer) => {
  getEntries(): ZipEntry[];
  extractAllTo(targetPath: string, overwrite?: boolean): void;
};

function loadAdmZip(): AdmZipCtor {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('adm-zip');
  } catch {
    throw new Error(
      'adm-zip is not installed. Run `pnpm install` in the monorepo root.',
    );
  }
}

import type { SocialArchiveProvider } from '@prisma/client';

export type ParsedSocialItem = {
  externalId: string;
  kind?: string;
  title?: string;
  caption?: string;
  takenAt?: string;
  stagingMediaKey?: string;
  privacyFlags?: string[];
};

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function parseInstagramJson(raw: unknown): ParsedSocialItem[] {
  const items: ParsedSocialItem[] = [];
  const root = raw as Record<string, unknown>;

  const posts = (root.posts ?? root.ig_posts ?? root) as unknown;
  const list = Array.isArray(posts) ? posts : [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const externalId = asString(row.id ?? row.uri ?? row.path) ?? `ig-${items.length + 1}`;
    const caption =
      asString(row.caption) ??
      asString((row.title as string) ?? '') ??
      asString(((row.media as Record<string, unknown> | undefined)?.caption as string) ?? '');
    const takenAt = asString(row.creation_timestamp as string) ?? asString(row.taken_at as string);
    const mediaPath = asString(row.uri ?? row.path ?? (row.media as Record<string, unknown> | undefined)?.uri);

    items.push({
      externalId,
      kind: 'PHOTO',
      title: caption?.slice(0, 120) ?? `Instagram ${externalId}`,
      caption,
      takenAt: takenAt ? new Date(Number.isNaN(Number(takenAt)) ? takenAt : Number(takenAt) * 1000).toISOString() : undefined,
      stagingMediaKey: mediaPath,
      privacyFlags: [],
    });
  }

  return items;
}

function parseFacebookJson(raw: unknown): ParsedSocialItem[] {
  const items: ParsedSocialItem[] = [];
  const list = Array.isArray(raw) ? raw : [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const data = (row.data as unknown[]) ?? [];
    const first = (data[0] as Record<string, unknown> | undefined) ?? row;
    const externalId = asString(first.post ?? row.timestamp) ?? `fb-${items.length + 1}`;
    const caption = asString(first.post ?? row.title);
    const takenAt = asString(row.timestamp as string);

    const attachments = (first.attachments as unknown[]) ?? [];
    let mediaPath: string | undefined;
    for (const att of attachments) {
      if (!att || typeof att !== 'object') continue;
      const media = (att as Record<string, unknown>).media as Record<string, unknown> | undefined;
      mediaPath = asString(media?.uri ?? media?.url);
      if (mediaPath) break;
    }

    items.push({
      externalId,
      kind: 'PHOTO',
      title: caption?.slice(0, 120) ?? `Facebook ${externalId}`,
      caption,
      takenAt: takenAt ? new Date(takenAt).toISOString() : undefined,
      stagingMediaKey: mediaPath,
      privacyFlags: [],
    });
  }

  return items;
}

function findJsonEntries(zip: ZipEntry[]): ZipEntry[] {
  return zip.filter((e) => !e.isDirectory && /\.json$/i.test(e.entryName));
}

function findMediaEntries(zip: ZipEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of zip) {
    if (e.isDirectory) continue;
    if (/\.(jpe?g|png|webp|mp4)$/i.test(e.entryName)) {
      map.set(e.entryName.split('/').pop()!.toLowerCase(), e.entryName);
    }
  }
  return map;
}

export function parseSocialArchiveBuffer(
  buffer: Buffer,
  fileName: string,
  provider: SocialArchiveProvider,
): ParsedSocialItem[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.json')) {
    const raw = JSON.parse(buffer.toString('utf8')) as unknown;
    if (provider === 'FACEBOOK') return parseFacebookJson(raw);
    return parseInstagramJson(raw);
  }

  if (!lower.endsWith('.zip')) {
    throw new Error(`Unsupported archive format: ${fileName}`);
  }

  const AdmZip = loadAdmZip();
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const mediaByName = findMediaEntries(entries);
  const jsonEntries = findJsonEntries(entries).filter((e) =>
    /posts|your_posts|media|content/i.test(e.entryName),
  );

  const targets = jsonEntries.length ? jsonEntries : findJsonEntries(entries);
  const merged: ParsedSocialItem[] = [];

  for (const entry of targets.slice(0, 20)) {
    try {
      const raw = JSON.parse(entry.getData().toString('utf8')) as unknown;
      const parsed = provider === 'FACEBOOK' ? parseFacebookJson(raw) : parseInstagramJson(raw);
      for (const item of parsed) {
        if (item.stagingMediaKey) {
          const base = item.stagingMediaKey.split('/').pop()?.toLowerCase();
          if (base && mediaByName.has(base)) {
            item.stagingMediaKey = mediaByName.get(base);
          }
        }
        merged.push(item);
      }
    } catch {
      // skip malformed JSON entries inside ZIP
    }
  }

  return merged;
}
