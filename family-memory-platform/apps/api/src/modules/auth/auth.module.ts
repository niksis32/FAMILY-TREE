import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { MfaModule } from '../mfa/mfa.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { RolesGuard } from './roles.guard';

/** JWT login and RBAC primitives for MVP API. */
@Module({
  imports: [JwtModule.register({}), PrismaModule, forwardRef(() => MfaModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthSessionService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  exports: [AuthService, AuthSessionService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
