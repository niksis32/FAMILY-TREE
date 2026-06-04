import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-first-admin')
  registerFirstAdmin(@Body() dto: RegisterFirstAdminDto) {
    return this.authService.registerFirstAdmin(dto);
  }
}
