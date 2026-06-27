import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const USER_ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/** Two-step delete: email must match target user; phrase must be DELETE. */
export class AdminSoftDeleteUserDto {
  @IsEmail()
  confirmEmail!: string;

  @IsString()
  @IsNotEmpty()
  confirmPhrase!: string;
}
