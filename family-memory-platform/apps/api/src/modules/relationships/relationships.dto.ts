import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRelationshipDto {
  @IsString()
  fromPersonId!: string;

  @IsString()
  toPersonId!: string;

  @IsIn(['PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'PARTNER', 'ADOPTIVE_PARENT', 'ADOPTIVE_CHILD', 'UNKNOWN'])
  type!: 'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING' | 'PARTNER' | 'ADOPTIVE_PARENT' | 'ADOPTIVE_CHILD' | 'UNKNOWN';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  sourceId?: string;
}

export class UpdateRelationshipDto extends PartialType(CreateRelationshipDto) {}
