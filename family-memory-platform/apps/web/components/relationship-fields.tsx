'use client';

import { useTranslations } from 'next-intl';
import { FormField, Select } from '@/components/ui';
import type { FamilyRecord } from '@/lib/api-client';
import { formatPersonLabel, type PersonNameFields } from '@/lib/person-display';
import type { RelationshipDraft, RelationshipUiType } from '@/lib/relationship-draft';

const RELATIONSHIP_TYPE_KEYS: RelationshipUiType[] = [
  'PARENT',
  'CHILD',
  'SPOUSE',
  'SIBLING',
  'PARTNER',
  'ADOPTIVE_PARENT',
  'ADOPTIVE_CHILD',
];

type FamilyMemberRecord = {
  person: PersonNameFields;
};

function familyMembers(family: FamilyRecord | undefined): PersonNameFields[] {
  const members = family?.members as FamilyMemberRecord[] | undefined;
  if (!members?.length) return [];
  return members.map((member) => member.person).filter(Boolean);
}

function PersonSelect({
  value,
  onChange,
  people,
  required,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  people: PersonNameFields[];
  required?: boolean;
  disabled?: boolean;
}) {
  const tCommon = useTranslations('common');

  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled}>
      <option value="">{tCommon('notSelected')}</option>
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {formatPersonLabel(person)}
        </option>
      ))}
    </Select>
  );
}

export function RelationshipFields({
  families,
  draft,
  onChange,
  disabled,
  whoHint,
}: {
  families: FamilyRecord[];
  draft: RelationshipDraft;
  onChange: (next: RelationshipDraft) => void;
  disabled?: boolean;
  whoHint?: string;
}) {
  const t = useTranslations('relationshipFields');
  const tCommon = useTranslations('common');
  const tRel = useTranslations('relationshipTypes');
  const selectedFamily = families.find((family) => family.id === draft.familyId);
  const people = familyMembers(selectedFamily);
  const noMembers = Boolean(draft.familyId) && people.length === 0;

  function patch(partial: Partial<RelationshipDraft>) {
    onChange({ ...draft, ...partial });
  }

  function onFamilyChange(familyId: string) {
    onChange({
      ...draft,
      familyId,
      whoId: '',
      toPersonId: '',
      fatherId: '',
      motherId: '',
      husbandId: '',
      wifeId: '',
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label={t('family')}>
        <Select value={draft.familyId} onChange={(event) => onFamilyChange(event.target.value)} disabled={disabled}>
          <option value="">{tCommon('notSelected')}</option>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.name?.trim() || tCommon('familyFallback', { id: family.id.slice(0, 8) })}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t('linkType')}>
        <Select
          value={draft.type}
          onChange={(event) => patch({ type: event.target.value as RelationshipUiType })}
          disabled={disabled || !draft.familyId}
        >
          {RELATIONSHIP_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {tRel(key)}
            </option>
          ))}
        </Select>
      </FormField>

      {noMembers ? <p className="text-xs text-amber-700 md:col-span-2 dark:text-amber-300">{t('noMembers')}</p> : null}

      {draft.type === 'SPOUSE' ? (
        <>
          <FormField label={t('husband')}>
            <PersonSelect
              value={draft.husbandId}
              onChange={(husbandId) => patch({ husbandId })}
              people={people}
              disabled={disabled || !draft.familyId}
            />
          </FormField>
          <FormField label={t('wife')}>
            <PersonSelect
              value={draft.wifeId}
              onChange={(wifeId) => patch({ wifeId })}
              people={people}
              disabled={disabled || !draft.familyId}
            />
          </FormField>
        </>
      ) : draft.type === 'CHILD' ? (
        <>
          <FormField label={t('whoChild')}>
            <PersonSelect
              value={draft.whoId}
              onChange={(whoId) => patch({ whoId })}
              people={people}
              disabled={disabled || !draft.familyId}
            />
            {whoHint ? <p className="text-xs text-stone-500 dark:text-slate-400">{whoHint}</p> : null}
          </FormField>
          <FormField label={t('father')}>
            <PersonSelect
              value={draft.fatherId}
              onChange={(fatherId) => patch({ fatherId })}
              people={people}
              disabled={disabled || !draft.familyId}
            />
          </FormField>
          <FormField label={t('mother')} className="md:col-span-2">
            <PersonSelect
              value={draft.motherId}
              onChange={(motherId) => patch({ motherId })}
              people={people}
              disabled={disabled || !draft.familyId}
            />
          </FormField>
        </>
      ) : (
        <>
          <FormField label={t('who')}>
            <PersonSelect
              value={draft.whoId}
              onChange={(whoId) => patch({ whoId })}
              people={people}
              required
              disabled={disabled || !draft.familyId}
            />
            {whoHint ? <p className="text-xs text-stone-500 dark:text-slate-400">{whoHint}</p> : null}
          </FormField>
          <FormField
            label={
              draft.type === 'SIBLING'
                ? t('sibling')
                : draft.type === 'PARENT'
                  ? t('childLabel')
                  : t('secondPerson')
            }
          >
            <PersonSelect
              value={draft.toPersonId}
              onChange={(toPersonId) => patch({ toPersonId })}
              people={people.filter((person) => person.id !== draft.whoId)}
              required
              disabled={disabled || !draft.familyId}
            />
          </FormField>
        </>
      )}
    </div>
  );
}
