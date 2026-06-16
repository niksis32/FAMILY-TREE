export const ARCHIVE_SEARCH_QUEUE = 'archive-search';

export const EXTERNAL_ARCHIVE_PROVIDERS = ['FAMILYSEARCH'] as const;

export type ExternalArchiveProviderId = (typeof EXTERNAL_ARCHIVE_PROVIDERS)[number];
