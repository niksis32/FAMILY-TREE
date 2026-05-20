'use client';

import { FormField, Select } from '@/components/ui';
import type { FamilyRecord } from '@/lib/api-client';
import { formatPersonLabel, type PersonNameFields } from '@/lib/person-display';
import type { RelationshipDraft, RelationshipUiType } from '@/lib/relationship-draft';

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
  placeholder,
  required,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  people: PersonNameFields[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled}>
      <option value="">{placeholder}</option>
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {formatPersonLabel(person)}
        </option>
      ))}
    </Select>
  );
}

const RELATIONSHIP_TYPE_OPTIONS: { value: RelationshipUiType; label: string }[] = [
  { value: 'PARENT', label: 'Родитель' },
  { value: 'CHILD', label: 'Ребёнок' },
  { value: 'SPOUSE', label: 'Супруги' },
  { value: 'SIBLING', label: 'Сестра / брат' },
  { value: 'PARTNER', label: 'Партнёр' },
  { value: 'ADOPTIVE_PARENT', label: 'Приёмный родитель' },
  { value: 'ADOPTIVE_CHILD', label: 'Приёмный ребёнок' },
];

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
      <FormField label="Семья">
        <Select value={draft.familyId} onChange={(event) => onFamilyChange(event.target.value)} disabled={disabled}>
          <option value="">Выберите семью</option>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.name?.trim() || `Семья ${family.id.slice(0, 8)}`}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Тип связи">
        <Select
          value={draft.type}
          onChange={(event) => patch({ type: event.target.value as RelationshipUiType })}
          disabled={disabled || !draft.familyId}
        >
          {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {noMembers ? (
        <p className="text-xs text-amber-700 md:col-span-2 dark:text-amber-300">
          В выбранной семье пока нет участников. Добавьте персон в семью на странице «Семьи» или выберите другую семью.
        </p>
      ) : null}

      {draft.type === 'SPOUSE' ? (
        <>
          <FormField label="Муж">
            <PersonSelect
              value={draft.husbandId}
              onChange={(husbandId) => patch({ husbandId })}
              people={people}
              placeholder="Выберите мужа"
              disabled={disabled || !draft.familyId}
            />
          </FormField>
          <FormField label="Жена">
            <PersonSelect
              value={draft.wifeId}
              onChange={(wifeId) => patch({ wifeId })}
              people={people}
              placeholder="Выберите жену"
              disabled={disabled || !draft.familyId}
            />
          </FormField>
        </>
      ) : draft.type === 'CHILD' ? (
        <>
          <FormField label="Кто">
            <PersonSelect
              value={draft.whoId}
              onChange={(whoId) => patch({ whoId })}
              people={people}
              placeholder="Ребёнок"
              disabled={disabled || !draft.familyId}
            />
            {whoHint ? <p className="text-xs text-stone-500 dark:text-slate-400">{whoHint}</p> : null}
          </FormField>
          <FormField label="Отец">
            <PersonSelect
              value={draft.fatherId}
              onChange={(fatherId) => patch({ fatherId })}
              people={people}
              placeholder="Выберите отца"
              disabled={disabled || !draft.familyId}
            />
          </FormField>
          <FormField label="Мать" className="md:col-span-2">
            <PersonSelect
              value={draft.motherId}
              onChange={(motherId) => patch({ motherId })}
              people={people}
              placeholder="Выберите мать"
              disabled={disabled || !draft.familyId}
            />
          </FormField>
        </>
      ) : (
        <>
          <FormField label="Кто">
            <PersonSelect
              value={draft.whoId}
              onChange={(whoId) => patch({ whoId })}
              people={people}
              placeholder="Выберите персону"
              required
              disabled={disabled || !draft.familyId}
            />
            {whoHint ? <p className="text-xs text-stone-500 dark:text-slate-400">{whoHint}</p> : null}
          </FormField>
          <FormField label={draft.type === 'SIBLING' ? 'Сестра / брат' : draft.type === 'PARENT' ? 'Ребёнок' : 'Связан с'}>
            <PersonSelect
              value={draft.toPersonId}
              onChange={(toPersonId) => patch({ toPersonId })}
              people={people.filter((person) => person.id !== draft.whoId)}
              placeholder="Выберите вторую персону"
              required
              disabled={disabled || !draft.familyId}
            />
          </FormField>
        </>
      )}
    </div>
  );
}
