import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSavedSearchDto, SearchQueryDto, UpdateSavedSearchDto } from './search.dto';
import { SearchService } from './search.service';
import type { SearchCategory } from './search.types';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  search(@Query('q') q?: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.search(q ?? '', user);
  }

  @Get('faceted')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  facetedSearch(@Query() query: SearchQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.facetedSearch(
      {
        q: query.q,
        categories: query.categories as SearchCategory[] | undefined,
        yearFrom: query.yearFrom,
        yearTo: query.yearTo,
        tags: query.tags,
        familyId: query.familyId,
        sort: query.sort,
        limit: query.limit,
      },
      user,
    );
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listSaved(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listSavedSearches(user.id);
  }

  @Post('saved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  createSaved(@Body() dto: CreateSavedSearchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createSavedSearch(user.id, dto.name, dto.query, dto.filters);
  }

  @Patch('saved/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  updateSaved(@Param('id') id: string, @Body() dto: UpdateSavedSearchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateSavedSearch(user.id, id, dto);
  }

  @Delete('saved/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  @ApiBearerAuth()
  deleteSaved(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.deleteSavedSearch(user.id, id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  history(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.service.listSearchHistory(user.id, limit ? Number.parseInt(limit, 10) : 30);
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  clearHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.service.clearSearchHistory(user.id);
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  reindex() {
    return this.service.reindexAll();
  }
}
