import { IsIn, IsOptional, IsString } from 'class-validator';

const FAMILY_MEMBER_ROLES = ['HUSBAND', 'WIFE', 'PARTNER', 'CHILD'] as const;

export class AddFamilyMemberDto {
  @IsString()
  personId!: string;

  @IsIn(FAMILY_MEMBER_ROLES)
  role!: (typeof FAMILY_MEMBER_ROLES)[number];
}

export class UpdateFamilyMemberDto {
  @IsOptional()
  @IsIn(FAMILY_MEMBER_ROLES)
  role?: (typeof FAMILY_MEMBER_ROLES)[number];
}
