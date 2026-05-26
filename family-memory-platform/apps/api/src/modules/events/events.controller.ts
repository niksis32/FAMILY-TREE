import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { CreateEventDto, UpdateEventDto } from './events.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(
    private readonly service: EventsService,
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
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthenticatedUser) {
    const event = await this.service.create(dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.EVENT_CREATE,
      entityType: 'event',
      entityId: event.id,
    });
    return event;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: AuthenticatedUser) {
    const event = await this.service.update(id, dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.EVENT_UPDATE,
      entityType: 'event',
      entityId: event.id,
    });
    return event;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
