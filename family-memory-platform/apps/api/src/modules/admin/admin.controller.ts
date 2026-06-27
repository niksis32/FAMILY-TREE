import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminCreateUserDto, AdminSoftDeleteUserDto, AdminUpdateUserDto } from './admin.dto';
import { AdminOpsService } from './admin-ops.service';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly ops: AdminOpsService,
  ) {}

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('ops')
  opsOverview() {
    return this.ops.getOverview();
  }

  @Get('users')
  listUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;
    return this.service.listUsers(
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      Number.isFinite(parsedOffset) ? parsedOffset : undefined,
    );
  }

  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateUser(id, dto, user.id);
  }

  @Post('users/:id/soft-delete')
  softDeleteUser(
    @Param('id') id: string,
    @Body() dto: AdminSoftDeleteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.softDeleteUser(id, dto, user.id);
  }
}
