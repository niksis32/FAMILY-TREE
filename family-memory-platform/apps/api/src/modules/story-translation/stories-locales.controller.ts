import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequestStoryTranslationDto } from './story-translation.dto';
import { StoryTranslationService } from './story-translation.service';

@ApiTags('stories')
@ApiBearerAuth()
@Controller('stories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class StoriesLocalesController {
  constructor(private readonly service: StoryTranslationService) {}

  @Get(':id/locales')
  listLocales(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listLocales(id, user.id);
  }

  @Get(':id/locales/:locale')
  getLocale(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getLocale(id, locale, user.id);
  }

  @Post(':id/locales/translate')
  requestTranslation(
    @Param('id') id: string,
    @Body() dto: RequestStoryTranslationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.requestTranslation(id, user.id, dto);
  }
}
