import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AskArchiveDto } from './ask-archive.dto';
import { AskArchiveService } from './ask-archive.service';

@ApiTags('ask-archive')
@ApiBearerAuth()
@Controller('ask-archive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR', 'VIEWER')
export class AskArchiveController {
  constructor(private readonly service: AskArchiveService) {}

  @Post()
  ask(@Body() dto: AskArchiveDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.ask(dto, user.id);
  }
}
