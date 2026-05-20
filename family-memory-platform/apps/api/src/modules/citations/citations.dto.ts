import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCitationDto {
  @IsString()
  sourceId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  detail?: string;
}

export class UpdateCitationDto extends PartialType(CreateCitationDto) {}
