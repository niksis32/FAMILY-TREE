import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GedcomTextDto {
  @IsString()
  @IsNotEmpty()
  gedcomText!: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class GedcomImportDto extends GedcomTextDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
