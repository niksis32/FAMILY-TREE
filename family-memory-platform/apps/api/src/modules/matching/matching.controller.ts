import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateMatchProfileDto } from './matching.dto';
import { MatchingService } from './matching.service';

/** PROMPT 9 — suggestions only; no automatic merge. */
@ApiTags('matching')
@ApiBearerAuth()
@Controller('matching')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR', 'VIEWER')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.matching.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMatchProfileDto) {
    return this.matching.updateProfile(user.id, dto.isOptedIn);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.matching.listInbox(user.id);
  }

  @Get('person/:id/candidates')
  personCandidates(@Param('id') personId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matching.listCandidatesForPerson(personId, user.id);
  }

  @Post('tree/:treeId/run')
  runForTree(@Param('treeId') familyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matching.startFamilyRun(familyId, user.id);
  }

  @Get('candidate/:id')
  getCandidate(@Param('id') candidateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matching.getCandidate(candidateId, user.id);
  }

  @Post('candidate/:id/accept')
  accept(@Param('id') candidateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matching.acceptCandidate(candidateId, user.id);
  }

  @Post('candidate/:id/reject')
  reject(@Param('id') candidateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matching.rejectCandidate(candidateId, user.id);
  }
}
