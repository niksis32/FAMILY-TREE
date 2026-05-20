export type RelationshipUiType =
  | 'PARENT'
  | 'CHILD'
  | 'SPOUSE'
  | 'SIBLING'
  | 'PARTNER'
  | 'ADOPTIVE_PARENT'
  | 'ADOPTIVE_CHILD';

export type RelationshipDraft = {
  familyId: string;
  type: RelationshipUiType;
  whoId: string;
  toPersonId: string;
  fatherId: string;
  motherId: string;
  husbandId: string;
  wifeId: string;
  notes: string;
};

export const emptyRelationshipDraft = (): RelationshipDraft => ({
  familyId: '',
  type: 'CHILD',
  whoId: '',
  toPersonId: '',
  fatherId: '',
  motherId: '',
  husbandId: '',
  wifeId: '',
  notes: '',
});

export type RelationshipCreateInput = {
  fromPersonId: string;
  toPersonId: string;
  type: RelationshipUiType;
  notes?: string;
};

/** Maps UI draft to one or more API relationship records. */
export function buildRelationshipCreates(
  draft: RelationshipDraft,
  fallbackWhoId?: string,
): RelationshipCreateInput[] {
  const whoId = draft.whoId || fallbackWhoId || '';
  if (!whoId) return [];

  switch (draft.type) {
    case 'CHILD': {
      const creates: RelationshipCreateInput[] = [];
      if (draft.fatherId) {
        creates.push({ fromPersonId: draft.fatherId, toPersonId: whoId, type: 'PARENT' });
      }
      if (draft.motherId) {
        creates.push({ fromPersonId: draft.motherId, toPersonId: whoId, type: 'PARENT' });
      }
      return creates;
    }
    case 'SPOUSE': {
      if (!draft.husbandId || !draft.wifeId || draft.husbandId === draft.wifeId) return [];
      return [{ fromPersonId: draft.husbandId, toPersonId: draft.wifeId, type: 'SPOUSE', notes: draft.notes || undefined }];
    }
    default: {
      if (!draft.toPersonId || whoId === draft.toPersonId) return [];
      return [
        {
          fromPersonId: whoId,
          toPersonId: draft.toPersonId,
          type: draft.type,
          notes: draft.notes || undefined,
        },
      ];
    }
  }
}

export function isRelationshipDraftFilled(draft: RelationshipDraft, fallbackWhoId?: string) {
  return buildRelationshipCreates(draft, fallbackWhoId).length > 0;
}
