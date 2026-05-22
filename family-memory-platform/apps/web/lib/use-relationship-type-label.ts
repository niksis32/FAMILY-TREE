'use client';

import { useTranslations } from 'next-intl';

export const RELATIONSHIP_TYPE_KEYS = [
  'PARENT',
  'CHILD',
  'SPOUSE',
  'SIBLING',
  'PARTNER',
  'ADOPTIVE_PARENT',
  'ADOPTIVE_CHILD',
  'UNKNOWN',
] as const;

export function useRelationshipTypeLabel() {
  const t = useTranslations('relationshipTypes');
  return (type: string) => {
    const key = type.toUpperCase().replace(/-/g, '_');
    if ((RELATIONSHIP_TYPE_KEYS as readonly string[]).includes(key)) {
      return t(key as (typeof RELATIONSHIP_TYPE_KEYS)[number]);
    }
    return type;
  };
}
