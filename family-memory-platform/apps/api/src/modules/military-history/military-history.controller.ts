import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApproveMilitaryConflictDto, CreateMilitaryConflictDto } from './military-history.dto';
import { MilitaryHistoryService } from './military-history.service';

@ApiTags('military-history')
@ApiBearerAuth()
@Controller('military-history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilitaryHistoryController {
  constructor(private readonly service: MilitaryHistoryService) {}

  @Get('conflicts')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  listConflicts(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listApprovedConflicts(user.id);
  }

  @Get('conflicts/pending')
  @Roles('ADMIN')
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listAllPendingForPlatformAdmin(user.id);
  }

  @Get('conflicts/proposals')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  listMyProposals(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyProposals(user.id);
  }

  @Post('conflicts')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  proposeConflict(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMilitaryConflictDto) {
    return this.service.proposeConflict(user.id, dto);
  }

  @Patch('conflicts/:id/approve')
  @Roles('ADMIN')
  approveConflict(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveMilitaryConflictDto,
  ) {
    return this.service.approveConflict(user.id, id, dto);
  }

  @Patch('conflicts/:id/reject')
  @Roles('ADMIN')
  rejectConflict(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.rejectConflict(user.id, id);
  }

  @Delete('conflicts/:id')
  @Roles('ADMIN')
  deleteConflict(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteApprovedConflict(user.id, id);
  }

  @Delete('conflicts/proposals/:id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  cancelProposal(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancelMyProposal(user.id, id);
  }
}
