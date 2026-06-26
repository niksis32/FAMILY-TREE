import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AnalyzeTombstonePhotoDto,
  CreateBurialSiteDto,
  CreateCemeteryDto,
  CreateMemorialDto,
  PlanCemeteryRouteDto,
  RequestPhotogrammetryDto,
  UpdateBurialSiteDto,
  UpdateCemeteryDto,
  UpdateMemorialDto,
} from './cemetery.dto';
import { CemeteryService } from './cemetery.service';

@ApiTags('cemetery')
@ApiBearerAuth()
@Controller('cemetery')
@UseGuards(JwtAuthGuard)
export class CemeteryController {
  constructor(private readonly service: CemeteryService) {}

  @Get()
  listCemeteries(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listCemeteries(user.id);
  }

  @Post()
  createCemetery(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCemeteryDto) {
    return this.service.createCemetery(user.id, dto);
  }

  @Get('map')
  map(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMapMarkers(user.id);
  }

  @Post('routes/plan')
  planRoute(@CurrentUser() user: AuthenticatedUser, @Body() dto: PlanCemeteryRouteDto) {
    return this.service.planRoute(user.id, dto);
  }

  @Post('analyze-photo')
  analyzePhoto(@CurrentUser() user: AuthenticatedUser, @Body() dto: AnalyzeTombstonePhotoDto) {
    return this.service.analyzePhoto(user.id, dto);
  }

  @Get('burial-sites')
  listBurialSites(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cemeteryId') cemeteryId?: string,
  ) {
    return this.service.listBurialSites(user.id, cemeteryId);
  }

  @Post('burial-sites')
  createBurialSite(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBurialSiteDto) {
    return this.service.createBurialSite(user.id, dto);
  }

  @Get('search')
  searchBurials(@CurrentUser() user: AuthenticatedUser, @Query('q') q?: string) {
    return this.service.searchBurials(user.id, q ?? '');
  }

  @Post('burial-sites/:id/reconstruction/request')
  requestPhotogrammetry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RequestPhotogrammetryDto,
  ) {
    return this.service.requestPhotogrammetry(user.id, id, dto.sourceMediaId);
  }

  @Get('photogrammetry-jobs/:jobId')
  getPhotogrammetryJob(@CurrentUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.service.getPhotogrammetryJob(user.id, jobId);
  }

  @Get('burial-sites/:id/reconstruction')
  getReconstruction(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getBurialSiteReconstruction(user.id, id);
  }

  @Get('burial-sites/:id')
  getBurialSite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getBurialSite(user.id, id);
  }

  @Patch('burial-sites/:id')
  updateBurialSite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBurialSiteDto,
  ) {
    return this.service.updateBurialSite(user.id, id, dto);
  }

  @Delete('burial-sites/:id')
  deleteBurialSite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteBurialSite(user.id, id);
  }

  @Get('memorials')
  listMemorials(
    @CurrentUser() user: AuthenticatedUser,
    @Query('burialSiteId') burialSiteId?: string,
  ) {
    return this.service.listMemorials(user.id, burialSiteId);
  }

  @Post('memorials')
  createMemorial(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMemorialDto) {
    return this.service.createMemorial(user.id, dto);
  }

  @Post('memorials/:id/share')
  enableMemorialShare(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.enableMemorialShare(user.id, id);
  }

  @Get('memorials/:id')
  getMemorial(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getMemorial(user.id, id);
  }

  @Patch('memorials/:id')
  updateMemorial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemorialDto,
  ) {
    return this.service.updateMemorial(user.id, id, dto);
  }

  @Delete('memorials/:id')
  deleteMemorial(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteMemorial(user.id, id);
  }

  @Get(':id')
  getCemetery(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getCemetery(user.id, id);
  }

  @Patch(':id')
  updateCemetery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCemeteryDto,
  ) {
    return this.service.updateCemetery(user.id, id, dto);
  }

  @Delete(':id')
  deleteCemetery(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteCemetery(user.id, id);
  }
}
