import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateSourceDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  publication?: string;

  @IsOptional()
  @IsString()
  repository?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSourceDto extends PartialType(CreateSourceDto) {}
