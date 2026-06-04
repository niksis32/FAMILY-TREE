import { BadRequestException } from '@nestjs/common';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LEN = 120;

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LEN);
  return base || 'story';
}

export function normalizeStorySlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LEN);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new BadRequestException(
      'Slug must be 2–120 lowercase letters, digits, and hyphens (e.g. ivanov-family-heritage)',
    );
  }
  return slug;
}
