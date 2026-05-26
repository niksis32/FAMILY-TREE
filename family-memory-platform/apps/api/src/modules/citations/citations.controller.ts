import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { CreateCitationDto, UpdateCitationDto } from './citations.dto';
import { CitationsService } from './citations.service';

@ApiTags('citations')
@ApiBearerAuth()
@Controller('citations')
export class CitationsController {
  constructor(
    private readonly service: CitationsService,
    private readonly gamification: GamificationActivityService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: CreateCitationDto, @CurrentUser() user: AuthenticatedUser) {
    const citation = await this.service.create(dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.CITATION_CREATE,
      entityType: 'citation',
      entityId: citation.id,
    });
    return citation;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdateCitationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
