import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DuplicateMergeService } from './duplicate-merge.service';

class MergePreviewDto {
  @IsString()
  survivorId!: string;

  @IsString()
  mergedId!: string;
}

class MergeExecuteDto extends MergePreviewDto {
  @IsBoolean()
  confirm!: boolean;
}

@ApiTags('duplicate-merge')
@ApiBearerAuth()
@Controller('duplicate-merge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class DuplicateMergeController {
  constructor(private readonly service: DuplicateMergeService) {}

  @Post('preview')
  preview(@Body() dto: MergePreviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.preview(dto.survivorId, dto.mergedId, user);
  }

  @Post('execute')
  execute(@Body() dto: MergeExecuteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.execute(dto.survivorId, dto.mergedId, user, dto.confirm);
  }

  @Get('audits')
  audits(@Query('limit') limit?: string) {
    return this.service.listAudits(limit ? Number.parseInt(limit, 10) : 50);
  }
}
