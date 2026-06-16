import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { HintSource, HintStatus } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { HintsService } from './hints.service';

@ApiTags('hints')
@ApiBearerAuth()
@Controller('hints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR', 'VIEWER')
export class HintsController {
  constructor(private readonly service: HintsService) {}

  @Get()
  list(
    @Query('status') status?: HintStatus,
    @Query('source') source?: HintSource,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(status ?? 'OPEN', source, limit ? Number.parseInt(limit, 10) : 50);
  }

  @Post('actions/sync')
  @Roles('ADMIN', 'EDITOR')
  sync() {
    return this.service.syncAdapters();
  }

  @Get(':id')
  explain(@Param('id') id: string) {
    return this.service.explain(id);
  }

  @Post(':id/accept')
  @Roles('ADMIN', 'EDITOR')
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.accept(id, user.id);
  }

  @Post(':id/dismiss')
  @Roles('ADMIN', 'EDITOR')
  dismiss(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.dismiss(id, user.id);
  }
}
