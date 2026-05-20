import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFamilyDto extends PartialType(CreateFamilyDto) {}
