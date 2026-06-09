import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import {
  MfaEnrollVerifyDto,
  MfaPasskeyAuthOptionsDto,
  MfaPasskeyAuthVerifyDto,
  MfaPasskeyRegisterVerifyDto,
  MfaVerifyLoginDto,
} from './mfa.dto';
import { MfaService } from './mfa.service';
import { AuthService } from '../auth/auth.service';

@ApiTags('mfa')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly auth: AuthService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.getStatus(user.id);
  }

  @Post('totp/enroll/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  enrollStart(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.enrollTotpStart(user.id);
  }

  @Post('totp/enroll/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  enrollVerify(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaEnrollVerifyDto) {
    return this.mfa.enrollTotpVerify(user.id, dto.code);
  }

  @Post('totp/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  disableTotp(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.disableTotp(user.id);
  }

  @Post('verify')
  verifyLogin(@Body() dto: MfaVerifyLoginDto) {
    return this.auth.completeMfaLogin(dto.mfaSessionToken, dto.code);
  }

  @Get('passkeys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listPasskeys(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.listPasskeys(user.id);
  }

  @Post('passkeys/register/options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  passkeyRegisterOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.passkeyRegisterOptions(user.id);
  }

  @Post('passkeys/register/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  passkeyRegisterVerify(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaPasskeyRegisterVerifyDto) {
    return this.mfa.passkeyRegisterVerify(user.id, dto.response, dto.deviceName);
  }

  @Post('passkeys/auth/options')
  passkeyAuthOptions(@Body() dto: MfaPasskeyAuthOptionsDto) {
    return this.mfa.passkeyAuthOptions(dto.mfaSessionToken);
  }

  @Post('passkeys/auth/verify')
  async passkeyAuthVerify(@Body() dto: MfaPasskeyAuthVerifyDto) {
    const result = await this.mfa.passkeyAuthVerify(dto.mfaSessionToken, dto.response);
    return this.auth.buildAuthResponseForUserId(result.userId);
  }
}
