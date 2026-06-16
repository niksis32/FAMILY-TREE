import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateWikiPageDto, CreateWikiRevisionDto, UpdateWikiPageDto } from './wiki.dto';
import { WikiService } from './wiki.service';

@ApiTags('wiki')
@ApiBearerAuth()
@Controller('wiki')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WikiController {
  constructor(private readonly service: WikiService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  list(@Query('familyId') familyId?: string) {
    return this.service.list(familyId);
  }

  @Get('pages/:slug')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateWikiPageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdateWikiPageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/revisions')
  @Roles('ADMIN', 'EDITOR')
  addRevision(
    @Param('id') id: string,
    @Body() dto: CreateWikiRevisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addRevision(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
