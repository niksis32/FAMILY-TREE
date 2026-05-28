import { Injectable } from '@nestjs/common';
import {
  buildHiddenDisplayName,
  treeNodeLabel,
  type PolicyPersonRecord,
  type PolicyViewerContext,
} from '@family/genealogy-core';
import { AccessControlService } from './access-control.service';

export interface RedactedTreeNodeFields {
  label: string;
  givenName: string;
  familyName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthYear: number | null;
  deathYear: number | null;
  isLiving: boolean;
  isHidden: boolean;
  avatarUrl: string | null;
}

@Injectable()
export class PolicyEngineService {
  constructor(private readonly access: AccessControlService) {}

  applyTreeNodeRedaction(
    person: PolicyPersonRecord,
    viewer: PolicyViewerContext,
    hideLivingPersons: boolean,
    avatarUrl: string | null,
  ): RedactedTreeNodeFields {
    const visible = this.access.canViewPersonRecord(person, viewer, hideLivingPersons);
    if (!visible) {
      return {
        label: buildHiddenDisplayName(),
        givenName: 'Living',
        familyName: 'person',
        birthDate: null,
        deathDate: null,
        birthYear: null,
        deathYear: null,
        isLiving: true,
        isHidden: true,
        avatarUrl: null,
      };
    }

    const redacted = this.access.redactPerson(person, viewer, hideLivingPersons) ?? person;
    return {
      label: treeNodeLabel(redacted, false),
      givenName: redacted.givenName,
      familyName: redacted.familyName ?? null,
      birthDate: redacted.birthDate ?? null,
      deathDate: redacted.deathDate ?? null,
      birthYear: redacted.birthDate ? new Date(redacted.birthDate).getFullYear() : null,
      deathYear: redacted.deathDate ? new Date(redacted.deathDate).getFullYear() : null,
      isLiving: redacted.isLiving,
      isHidden: false,
      avatarUrl: redacted.isLiving && viewer.role === 'anonymous' ? null : avatarUrl,
    };
  }
}
