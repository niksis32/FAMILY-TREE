export type PersonNameFields = {
  id: string;
  givenName: string;
  patronymic?: string | null;
  familyName?: string | null;
};

export function formatPersonLabel(person: PersonNameFields) {
  return [person.givenName, person.patronymic, person.familyName].filter(Boolean).join(' ');
}
