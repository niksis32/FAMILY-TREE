import { IsIn, IsString } from 'class-validator';

export class RejectSuggestionDto {
  @IsString()
  suggestionId!: string;

  @IsIn(['event', 'relationship', 'entity'])
  kind!: 'event' | 'relationship' | 'entity';
}
