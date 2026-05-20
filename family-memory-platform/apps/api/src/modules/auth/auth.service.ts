import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginDto, RegisterFirstAdminDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerFirstAdmin(dto: RegisterFirstAdminDto) {
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

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  private async buildAuthResponse(user: SafeUser) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
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
