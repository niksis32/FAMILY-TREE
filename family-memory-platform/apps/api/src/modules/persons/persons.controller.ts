import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { CreatePersonDto, UpdatePersonDto } from './persons.dto';
import { PersonsService } from './persons.service';

@ApiTags('persons')
@ApiBearerAuth()
@Controller('persons')
export class PersonsController {
  constructor(
    private readonly service: PersonsService,
    private readonly gamification: GamificationActivityService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.service.findAll(user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: CreatePersonDto, @CurrentUser() user: AuthenticatedUser) {
    const person = await this.service.create(dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.PERSON_CREATE,
      entityType: 'person',
      entityId: person.id,
    });
    return person;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() dto: UpdatePersonDto, @CurrentUser() user: AuthenticatedUser) {
    const person = await this.service.update(id, dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.PERSON_UPDATE,
      entityType: 'person',
      entityId: person.id,
    });
    return person;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
