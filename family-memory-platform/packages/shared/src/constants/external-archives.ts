export const ARCHIVE_SEARCH_QUEUE = 'archive-search';

export const EXTERNAL_ARCHIVE_PROVIDERS = ['FAMILYSEARCH'] as const;

export type ExternalArchiveProviderId = (typeof EXTERNAL_ARCHIVE_PROVIDERS)[number];

/** Monthly archive searches per workspace (FREE tier). PROFESSIONAL+ uses plan multiplier. */
export const ARCHIVE_SEARCH_MONTHLY_QUOTA_FREE = 20;
export const ARCHIVE_SEARCH_MONTHLY_QUOTA_PRO = 200;
