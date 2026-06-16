import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { PdfExportTemplateCode } from '@prisma/client';

export class PreviewExportDto {
  @IsEnum(['FAMILY_BOOK_STANDARD', 'FAMILY_BOOK_A2', 'TREE_POSTER_A3'])
  templateCode!: PdfExportTemplateCode;

  @IsOptional()
  @IsString()
  rootPersonId?: string;

  @IsOptional()
  @IsString()
  familyId?: string;
}

export class CreateExportJobDto extends PreviewExportDto {}
