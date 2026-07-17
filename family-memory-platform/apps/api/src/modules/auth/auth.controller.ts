import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { extractAuthRequestMeta } from './auth-request.util';
import { LoginDto, RegisterFirstAdminDto } from './auth.dto';
import { AuthService } from './auth.service';

/** Brute-force protection: 5 login attempts per IP per minute. */
const LOGIN_THROTTLE = { 'auth-login': { limit: 5, ttl: 60_000 } } as const;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle(LOGIN_THROTTLE)
  login(@Body() dto: LoginDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.authService.login(dto, extractAuthRequestMeta(req));
  }

  @Post('register-first-admin')
  registerFirstAdmin(
    @Body() dto: RegisterFirstAdminDto,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.authService.registerFirstAdmin(dto, extractAuthRequestMeta(req));
  }
}
