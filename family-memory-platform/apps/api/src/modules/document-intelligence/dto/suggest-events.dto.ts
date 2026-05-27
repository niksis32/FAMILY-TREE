import { IsArray, IsOptional, IsString } from 'class-validator';

export class SuggestEventsDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownPersonIds?: string[];
}
