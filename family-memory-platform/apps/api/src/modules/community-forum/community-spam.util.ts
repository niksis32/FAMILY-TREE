/** Normalize post/thread text for duplicate detection. */
export function normalizeCommunityText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

export function countUrlsInContent(content: string): number {
  return (content.match(URL_PATTERN) ?? []).length;
}
