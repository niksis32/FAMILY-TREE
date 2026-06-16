import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PersonEditLockService } from './person-edit-lock.service';

class AcquireLockDto {
  @IsOptional()
  @IsString()
  field?: string;
}

@ApiTags('collaboration')
@ApiBearerAuth()
@Controller('collaboration/persons')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly locks: PersonEditLockService) {}

  @Get(':id/lock')
  getLock(@Param('id') personId: string) {
    return this.locks.getLock(personId);
  }

  @Post(':id/lock')
  acquire(
    @Param('id') personId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcquireLockDto,
  ) {
    return this.locks.acquire(personId, user.id, dto.field);
  }

  @Delete(':id/lock')
  release(
    @Param('id') personId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcquireLockDto,
  ) {
    return this.locks.release(personId, user.id, dto.field);
  }
}
