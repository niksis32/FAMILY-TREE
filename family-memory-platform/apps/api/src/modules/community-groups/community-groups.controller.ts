import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateCommunityGroupDto, ListCommunityGroupsQueryDto } from './community-groups.dto';
import { CommunityGroupsService } from './community-groups.service';

@ApiTags('community-groups')
@Controller('community/groups')
export class CommunityGroupsController {
  constructor(private readonly groups: CommunityGroupsService) {}

  @Get()
  list(@Query() query: ListCommunityGroupsQueryDto) {
    return this.groups.listPublic(query);
  }

  @Get('by-type/:type')
  listByType(@Param('type') type: string) {
    return this.groups.listByType(type as never);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.groups.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateCommunityGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.groups.create(user.id, dto);
  }
}
