import { IsOptional, IsString } from 'class-validator';

export class CreateWikiPageDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  familyId?: string;
}

export class UpdateWikiPageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  familyId?: string;
}

export class CreateWikiRevisionDto {
  @IsString()
  content!: string;
}
