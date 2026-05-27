import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateMatchProfileDto {
  @IsBoolean()
  isOptedIn!: boolean;
}

export class RejectMatchCandidateDto {
  @IsOptional()
  @IsString()
  note?: string;
}
