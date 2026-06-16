import { ForbiddenException, Injectable } from '@nestjs/common';
import { EXTERNAL_ARCHIVE_PROVIDERS, type ExternalArchiveProviderId } from '@family/shared';

const PROVIDER_TERMS: Record<ExternalArchiveProviderId, string> = {
  FAMILYSEARCH: 'https://www.familysearch.org/en/legal/terms',
};

@Injectable()
export class ArchiveComplianceService {
  private readonly allowlist = new Set<string>(EXTERNAL_ARCHIVE_PROVIDERS);

  assertProviderAllowed(provider: string): asserts provider is ExternalArchiveProviderId {
    if (!this.allowlist.has(provider)) {
      throw new ForbiddenException(`External archive provider "${provider}" is not on the ToS allowlist`);
    }
  }

  getTermsUrl(provider: ExternalArchiveProviderId): string {
    return PROVIDER_TERMS[provider];
  }

  listAllowedProviders(): ExternalArchiveProviderId[] {
    return [...this.allowlist] as ExternalArchiveProviderId[];
  }
}
