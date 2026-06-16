import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateWebhookEndpointDto,
  ListWebhookEventsQueryDto,
  UpdateWebhookEndpointDto,
} from './webhooks.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get('endpoints')
  listEndpoints(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listEndpoints(user.id);
  }

  @Post('endpoints')
  createEndpoint(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWebhookEndpointDto) {
    return this.service.createEndpoint(user.id, dto);
  }

  @Get('endpoints/:id')
  getEndpoint(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getEndpoint(user.id, id);
  }

  @Patch('endpoints/:id')
  updateEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    return this.service.updateEndpoint(user.id, id, dto);
  }

  @Delete('endpoints/:id')
  deleteEndpoint(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteEndpoint(user.id, id);
  }

  @Post('endpoints/:id/test')
  testEndpoint(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.testEndpoint(user.id, id);
  }

  @Get('events')
  listEvents(@CurrentUser() user: AuthenticatedUser, @Query() query: ListWebhookEventsQueryDto) {
    return this.service.listEvents(user.id, query);
  }

  @Get('events/:id')
  getEvent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getEvent(user.id, id);
  }

  @Post('events/:id/retry')
  retryEvent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.retryEvent(user.id, id);
  }
}
