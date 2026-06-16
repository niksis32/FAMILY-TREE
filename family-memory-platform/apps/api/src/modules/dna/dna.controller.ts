import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DnaService } from './dna.service';

class DnaUploadUrlDto {
  @IsString()
  @MinLength(1)
  fileName!: string;
}

class CreateDnaImportJobDto {
  @IsString()
  @MinLength(1)
  fileKey!: string;

  @IsString()
  @MinLength(1)
  fileName!: string;
}

@ApiTags('dna')
@ApiBearerAuth()
@Controller('dna')
@UseGuards(JwtAuthGuard)
export class DnaController {
  constructor(private readonly service: DnaService) {}

  @Post('upload-url')
  uploadUrl(@CurrentUser() user: AuthenticatedUser, @Body() dto: DnaUploadUrlDto) {
    return this.service.createUploadUrl(user.id, dto.fileName);
  }

  @Post('import-jobs')
  importJob(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDnaImportJobDto) {
    return this.service.createImportJob(user.id, dto.fileKey, dto.fileName);
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getProfile(user.id);
  }

  @Delete('profile')
  deleteProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.service.deleteProfile(user.id);
  }

  @Post('consent/import')
  grantConsent(@CurrentUser() user: AuthenticatedUser) {
    return this.service.grantConsent(user.id);
  }
}
