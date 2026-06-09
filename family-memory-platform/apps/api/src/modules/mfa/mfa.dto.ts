import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MfaEnrollVerifyDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class MfaVerifyLoginDto {
  @IsString()
  @IsNotEmpty()
  mfaSessionToken!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class MfaPasskeyAuthOptionsDto {
  @IsString()
  @IsNotEmpty()
  mfaSessionToken!: string;
}

export class MfaPasskeyAuthVerifyDto {
  @IsString()
  @IsNotEmpty()
  mfaSessionToken!: string;

  @IsNotEmpty()
  response!: Record<string, unknown>;
}

export class MfaPasskeyRegisterVerifyDto {
  @IsNotEmpty()
  response!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
