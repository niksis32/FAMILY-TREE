import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class CreateMediaCommentDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class UpdateMediaCommentDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class UpsertPhotoInsightDto {
  @IsOptional()
  estimatedYearFrom?: number;

  @IsOptional()
  estimatedYearTo?: number;

  @IsOptional()
  detectedClothingStyle?: string;

  @IsOptional()
  aiDescription?: string;

  @IsOptional()
  uncertaintyNotes?: string;
}

export class BulkAssignFaceTagsDto {
  @IsArray()
  @ArrayMinSize(1)
  assignments!: Array<{
    faceTagId: string;
    personId: string;
  }>;
}

export class SuggestPersonQueryDto {
  @IsOptional()
  @IsString()
  faceTagId?: string;
}
