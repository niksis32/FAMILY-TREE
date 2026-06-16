import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  ConfirmSocialImportDto,
  CreateSocialImportDto,
  UpdateSocialImportSelectionDto,
} from './social-archive-import.dto';
import { SocialArchiveImportService } from './social-archive-import.service';

@ApiTags('social-archive-import')
@ApiBearerAuth()
@Controller('social-archive-import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SocialArchiveImportController {
  constructor(private readonly service: SocialArchiveImportService) {}

  @Get('providers')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  providers() {
    return [
      { id: 'INSTAGRAM', label: 'Instagram', instructionsKey: 'socialArchiveImport.providers.instagram' },
      { id: 'FACEBOOK', label: 'Facebook', instructionsKey: 'socialArchiveImport.providers.facebook' },
    ];
  }

  @Post('upload-url')
  @Roles('ADMIN', 'EDITOR')
  uploadUrl(@Body('fileName') fileName: string) {
    return this.service.getUploadUrl(fileName);
  }

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  list() {
    return this.service.listImports();
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateSocialImportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createImport(dto, user);
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  one(@Param('id') id: string) {
    return this.service.getImport(id);
  }

  @Get(':id/items')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  items(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.service.listItems(id, cursor);
  }

  @Patch(':id/items/selection')
  @Roles('ADMIN', 'EDITOR')
  selection(@Param('id') id: string, @Body() dto: UpdateSocialImportSelectionDto) {
    return this.service.updateSelection(id, dto);
  }

  @Post(':id/confirm')
  @Roles('ADMIN', 'EDITOR')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmSocialImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmImport(id, dto, user);
  }
}
