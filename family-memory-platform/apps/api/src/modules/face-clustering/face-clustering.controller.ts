import { Controller, Get, Param, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssignClusterPersonDto } from './face-clustering.dto';
import { FaceClusteringService } from './face-clustering.service';

@ApiTags('face-clusters')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaceClusteringController {
  constructor(private readonly service: FaceClusteringService) {}

  @Get('media/people/summary')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  summary() {
    return this.service.getPeopleSummary();
  }

  @Get('face-clusters')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  list(@Query('status') status?: string) {
    return this.service.listClusters(status);
  }

  @Get('face-clusters/:id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  detail(@Param('id') id: string) {
    return this.service.getCluster(id);
  }

  @Post('face-clusters/rebuild')
  @Roles('ADMIN', 'EDITOR')
  rebuild(@CurrentUser() user: AuthenticatedUser) {
    return this.service.enqueueRebuild(user);
  }

  @Post('face-clusters/:id/assign-person')
  @Roles('ADMIN', 'EDITOR')
  assignPerson(
    @Param('id') id: string,
    @Body() dto: AssignClusterPersonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.assignPerson(id, dto, user);
  }
}
