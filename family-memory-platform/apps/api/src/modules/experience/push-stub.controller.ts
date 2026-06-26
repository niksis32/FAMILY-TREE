import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Push notification hooks — stub for BLOCK 4 PWA (#04) */
@ApiTags('push')
@ApiBearerAuth()
@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushStubController {
  @Post('subscribe')
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() body: { endpoint?: string }) {
    return {
      ok: true,
      stub: true,
      userId: user.id,
      endpoint: body.endpoint ?? null,
      message: 'Push subscription stub — wire VAPID + web-push in production',
    };
  }
}
