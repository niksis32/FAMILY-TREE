import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCitationTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  format!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCitationTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateEvidenceCitationDto {
  @IsString()
  sourceId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  detail?: string;
}
