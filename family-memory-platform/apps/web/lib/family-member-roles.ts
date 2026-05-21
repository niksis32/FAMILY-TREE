export const FAMILY_MEMBER_ROLE_OPTIONS = [
  { value: 'HUSBAND', label: 'Муж' },
  { value: 'WIFE', label: 'Жена' },
  { value: 'PARTNER', label: 'Партнёр' },
  { value: 'CHILD', label: 'Ребёнок' },
] as const;

export function familyMemberRoleLabel(role: string) {
  return FAMILY_MEMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
