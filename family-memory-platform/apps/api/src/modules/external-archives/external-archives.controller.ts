import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ExternalArchiveSearchDto, ImportExternalRecordDto } from './external-archives.dto';
import { ExternalArchivesService } from './external-archives.service';

@ApiTags('external-archives')
@ApiBearerAuth()
@Controller('external-archives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExternalArchivesController {
  constructor(private readonly service: ExternalArchivesService) {}

  @Get('providers')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  providers() {
    return this.service.listProviders();
  }

  @Get('quota')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  quota(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getQuotaUsage(user.id);
  }

  @Post('search')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  search(@Body() dto: ExternalArchiveSearchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.startSearch(dto, user);
  }

  @Get('searches/:id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  getSearch(@Param('id') id: string) {
    return this.service.getSearch(id);
  }

  @Get('records/:provider/:id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  getRecord(@Param('provider') provider: string, @Param('id') id: string) {
    return this.service.getRecord(provider, id);
  }

  @Post('import')
  @Roles('ADMIN', 'EDITOR')
  importRecord(@Body() dto: ImportExternalRecordDto) {
    return this.service.importRecord(dto);
  }

  @Get('imported')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  imported() {
    return this.service.listImported();
  }
}
