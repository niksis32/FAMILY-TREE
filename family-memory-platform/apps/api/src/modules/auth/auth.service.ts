import { ConflictException, Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginEventOutcome } from '@prisma/client';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MfaService } from '../mfa/mfa.service';
import type { AuthRequestMeta } from './auth-request.util';
import { AuthSessionService } from './auth-session.service';
import type { LoginDto, RegisterFirstAdminDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: AuthSessionService,
    @Inject(forwardRef(() => MfaService))
    private readonly mfa: MfaService,
  ) {}

  async registerFirstAdmin(dto: RegisterFirstAdminDto, meta: AuthRequestMeta = {}) {
    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', deletedAt: null },
      select: { id: true },
    });

    if (existingAdmin) {
      throw new ConflictException('First admin is already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        displayName: dto.displayName,
        passwordHash: this.hashPassword(dto.password),
        role: 'ADMIN',
      },
      select: this.safeUserSelect(),
    });

    return this.buildAuthResponse(user, meta);
  }

  async login(dto: LoginDto, meta: AuthRequestMeta = {}) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user || user.deletedAt) {
      await this.sessions.recordLoginEvent({
        emailAttempt: email,
        outcome: LoginEventOutcome.FAILURE_BAD_CREDENTIALS,
        meta,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.sessions.recordLoginEvent({
        userId: user.id,
        emailAttempt: email,
        outcome: LoginEventOutcome.FAILURE_INACTIVE,
        meta,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!this.verifyPassword(dto.password, user.passwordHash)) {
      await this.sessions.recordLoginEvent({
        userId: user.id,
        emailAttempt: email,
        outcome: LoginEventOutcome.FAILURE_BAD_CREDENTIALS,
        meta,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const mfaRequired = await this.mfa.isMfaRequired(user.id);
    if (mfaRequired) {
      await this.sessions.recordLoginEvent({
        userId: user.id,
        emailAttempt: email,
        outcome: LoginEventOutcome.MFA_CHALLENGE,
        meta,
      });
      const mfaSessionToken = await this.mfa.createMfaSession(user.id);
      const status = await this.mfa.getStatus(user.id);
      const methods: Array<'totp' | 'recovery' | 'passkey'> = [];
      if (status.totpEnabled) {
        methods.push('totp', 'recovery');
      }
      if (status.passkeysEnabled) methods.push('passkey');
      return {
        mfaRequired: true as const,
        mfaSessionToken,
        methods,
        user: { id: user.id, email: user.email },
      };
    }

    return this.buildAuthResponse(safeUser, meta);
  }

  async completeMfaLogin(mfaSessionToken: string, code: string, meta: AuthRequestMeta = {}) {
    try {
      const result = await this.mfa.verifyLoginMfa(mfaSessionToken, code);
      return this.buildAuthResponseForUserId(result.userId, meta);
    } catch (error) {
      await this.sessions.recordLoginEvent({
        outcome: LoginEventOutcome.FAILURE_MFA,
        meta,
      });
      throw error;
    }
  }

  async buildAuthResponseForUserId(userId: string, meta: AuthRequestMeta = {}) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: this.safeUserSelect(),
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.buildAuthResponse(user, meta);
  }

  private async buildAuthResponse(user: SafeUser, meta: AuthRequestMeta = {}) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    const session = await this.sessions.createSession(user.id, meta);

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti: session.jti,
      },
      {
        secret,
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '7d',
      },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      user,
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [algorithm, salt, hash] = stored.split(':');
    if (algorithm !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const actual = Buffer.from(hash, 'hex');
    const expected = scryptSync(password, salt, 64);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private safeUserSelect() {
    return {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}

type SafeUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: 'VIEWER' | 'EDITOR' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
