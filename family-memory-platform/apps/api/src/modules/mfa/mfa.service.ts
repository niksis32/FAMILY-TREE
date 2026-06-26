import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  decryptSecret,
  encryptSecret,
  hashRecoveryCode,
  hashToken,
} from './mfa-crypto';

const PASSKEY_CHALLENGE_TTL_SECONDS = 5 * 60;
const PASSKEY_CHALLENGE_PREFIX = 'webauthn:challenge:';

@Injectable()
export class MfaService {
  /** Fallback when Redis is unavailable (single-instance dev). */
  private readonly passkeyChallenges = new Map<string, { challenge: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private challengeRedisKey(key: string) {
    return `${PASSKEY_CHALLENGE_PREFIX}${key}`;
  }

  private async storeChallenge(key: string, challenge: string) {
    const client = this.redis.getConnection();
    if (client) {
      await client.setex(this.challengeRedisKey(key), PASSKEY_CHALLENGE_TTL_SECONDS, challenge);
      return;
    }
    this.passkeyChallenges.set(key, { challenge, expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_SECONDS * 1000 });
  }

  private async consumeChallenge(key: string): Promise<string> {
    const client = this.redis.getConnection();
    if (client) {
      const redisKey = this.challengeRedisKey(key);
      const challenge = await client.get(redisKey);
      await client.del(redisKey);
      if (!challenge) {
        throw new BadRequestException('Passkey challenge expired');
      }
      return challenge;
    }

    const row = this.passkeyChallenges.get(key);
    this.passkeyChallenges.delete(key);
    if (!row || row.expiresAt < Date.now()) {
      throw new BadRequestException('Passkey challenge expired');
    }
    return row.challenge;
  }

  async getStatus(userId: string) {
    const settings = await this.prisma.userMfaSettings.findUnique({ where: { userId } });
    const passkeys = await this.prisma.webAuthnCredential.count({ where: { userId } });
    return {
      totpEnabled: settings?.totpEnabled ?? false,
      passkeysEnabled: (settings?.passkeysEnabled ?? false) || passkeys > 0,
      passkeyCount: passkeys,
      enrolledAt: settings?.enrolledAt?.toISOString() ?? null,
    };
  }

  async enrollTotpStart(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = authenticator.generateSecret();
    const master = this.requireMfaMasterSecret();
    const encrypted = encryptSecret(secret, master);

    await this.prisma.userMfaSettings.upsert({
      where: { userId },
      create: { userId, totpSecretEnc: encrypted, totpEnabled: false },
      update: { totpSecretEnc: encrypted, totpEnabled: false },
    });

    const otpauthUrl = authenticator.keyuri(user.email, 'Family Memory Platform', secret);
    return { secret, otpauthUrl };
  }

  async enrollTotpVerify(userId: string, code: string) {
    const settings = await this.prisma.userMfaSettings.findUnique({ where: { userId } });
    if (!settings?.totpSecretEnc) throw new BadRequestException('Start TOTP enrollment first');

    const secret = decryptSecret(settings.totpSecretEnc, this.requireMfaMasterSecret());
    if (!authenticator.verify({ token: code, secret })) {
      throw new BadRequestException('Invalid TOTP code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    await this.prisma.$transaction([
      this.prisma.userMfaSettings.update({
        where: { userId },
        data: { totpEnabled: true, enrolledAt: new Date() },
      }),
      this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      ...recoveryCodes.map((raw) =>
        this.prisma.mfaRecoveryCode.create({
          data: { userId, codeHash: hashRecoveryCode(raw) },
        }),
      ),
    ]);

    return { recoveryCodes, enabled: true };
  }

  async disableTotp(userId: string) {
    await this.prisma.userMfaSettings.updateMany({
      where: { userId },
      data: { totpEnabled: false, totpSecretEnc: null },
    });
    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async isMfaRequired(userId: string): Promise<boolean> {
    const settings = await this.prisma.userMfaSettings.findUnique({ where: { userId } });
    if (settings?.totpEnabled) return true;
    const passkeys = await this.prisma.webAuthnCredential.count({ where: { userId } });
    return passkeys > 0;
  }

  async createMfaSession(userId: string): Promise<string> {
    const raw = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.mfaSession.create({
      data: { userId, tokenHash: hashToken(raw), expiresAt },
    });
    return raw;
  }

  async resolveMfaSession(token: string) {
    const row = await this.prisma.mfaSession.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    });
    if (!row) throw new UnauthorizedException('MFA session expired or invalid');
    return row;
  }

  async consumeMfaSession(token: string) {
    const row = await this.resolveMfaSession(token);
    await this.prisma.mfaSession.delete({ where: { id: row.id } });
    return row;
  }

  async verifyLoginMfa(token: string, code: string) {
    const session = await this.resolveMfaSession(token);
    const settings = await this.prisma.userMfaSettings.findUnique({ where: { userId: session.userId } });

    if (settings?.totpEnabled && settings.totpSecretEnc) {
      const secret = decryptSecret(settings.totpSecretEnc, this.requireMfaMasterSecret());
      if (authenticator.verify({ token: code, secret })) {
        await this.consumeMfaSession(token);
        return { userId: session.userId, method: 'totp' as const };
      }
    }

    const recovery = await this.prisma.mfaRecoveryCode.findFirst({
      where: { userId: session.userId, codeHash: hashRecoveryCode(code), usedAt: null },
    });
    if (recovery) {
      await this.prisma.$transaction([
        this.prisma.mfaRecoveryCode.update({
          where: { id: recovery.id },
          data: { usedAt: new Date() },
        }),
        this.prisma.mfaSession.delete({ where: { id: session.id } }),
      ]);
      return { userId: session.userId, method: 'recovery' as const };
    }

    throw new UnauthorizedException('Invalid MFA code');
  }

  async listPasskeys(userId: string) {
    const rows = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      deviceName: r.deviceName,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    }));
  }

  async passkeyRegisterOptions(userId: string) {
    this.assertHttpsForPasskeys();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const credentials = await this.prisma.webAuthnCredential.findMany({ where: { userId } });
    const options = await generateRegistrationOptions({
      rpName: 'Family Memory Platform',
      rpID: this.rpId(),
      userName: user.email,
      userDisplayName: user.displayName ?? user.email,
      attestationType: 'none',
      excludeCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports?.split(',') as AuthenticatorTransportFuture[] | undefined,
      })),
    });

    await this.storeChallenge(`register:${userId}`, options.challenge);
    return options;
  }

  async passkeyRegisterVerify(userId: string, response: Record<string, unknown>, deviceName?: string) {
    this.assertHttpsForPasskeys();
    const verification = await verifyRegistrationResponse({
      response: response as never,
      expectedChallenge: await this.consumeChallenge(`register:${userId}`),
      expectedOrigin: this.expectedOrigin(),
      expectedRPID: this.rpId(),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration failed');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: Buffer.from(credential.id).toString('base64url'),
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: BigInt(credential.counter),
        deviceName: deviceName ?? credentialDeviceType,
        transports: credential.transports?.join(',') ?? null,
      },
    });

    await this.prisma.userMfaSettings.upsert({
      where: { userId },
      create: { userId, passkeysEnabled: true, enrolledAt: new Date() },
      update: { passkeysEnabled: true, enrolledAt: new Date() },
    });

    return { verified: true, backedUp: credentialBackedUp };
  }

  async passkeyAuthOptions(mfaSessionToken: string) {
    this.assertHttpsForPasskeys();
    const session = await this.resolveMfaSession(mfaSessionToken);
    const credentials = await this.prisma.webAuthnCredential.findMany({ where: { userId: session.userId } });
    if (credentials.length === 0) throw new BadRequestException('No passkeys enrolled');

    const options = await generateAuthenticationOptions({
      rpID: this.rpId(),
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports?.split(',') as AuthenticatorTransportFuture[] | undefined,
      })),
      userVerification: 'preferred',
    });
    await this.storeChallenge(`auth:${mfaSessionToken}`, options.challenge);
    return options;
  }

  async passkeyAuthVerify(mfaSessionToken: string, response: Record<string, unknown>) {
    this.assertHttpsForPasskeys();
    const session = await this.resolveMfaSession(mfaSessionToken);
    const credentialId = String((response as { id?: string }).id ?? '');
    const stored = await this.prisma.webAuthnCredential.findFirst({
      where: { userId: session.userId, credentialId },
    });
    if (!stored) throw new BadRequestException('Unknown passkey');

    const verification = await verifyAuthenticationResponse({
      response: response as never,
      expectedChallenge: await this.consumeChallenge(`auth:${mfaSessionToken}`),
      expectedOrigin: this.expectedOrigin(),
      expectedRPID: this.rpId(),
      credential: {
        id: stored.credentialId,
        publicKey: Buffer.from(stored.publicKey, 'base64'),
        counter: Number(stored.counter),
        transports: stored.transports?.split(',') as AuthenticatorTransportFuture[] | undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) throw new UnauthorizedException('Passkey verification failed');

    await this.prisma.$transaction([
      this.prisma.webAuthnCredential.update({
        where: { id: stored.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
      }),
      this.prisma.mfaSession.delete({ where: { id: session.id } }),
    ]);

    return { userId: session.userId, method: 'passkey' as const };
  }

  private generateRecoveryCodes(count = 8): string[] {
    return Array.from({ length: count }, () => {
      const part = randomBytes(4).toString('hex').toUpperCase();
      return `${part.slice(0, 4)}-${part.slice(4, 8)}`;
    });
  }

  private requireMfaMasterSecret(): string {
    const secret = this.config.get<string>('MFA_ENCRYPTION_SECRET') ?? this.config.get<string>('JWT_SECRET');
    if (!secret) throw new ForbiddenException('MFA encryption secret is not configured');
    return secret;
  }

  private rpId(): string {
    return this.config.get<string>('WEBAUTHN_RP_ID') ?? 'localhost';
  }

  private expectedOrigin(): string {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    return appUrl.split(',')[0]?.trim() ?? 'http://localhost:3000';
  }

  private assertHttpsForPasskeys() {
    const nodeEnv = this.config.get<string>('NODE_ENV');
    const origin = this.expectedOrigin();
    if (nodeEnv === 'production' && !origin.startsWith('https://')) {
      throw new ForbiddenException('Passkeys require HTTPS in production');
    }
  }
}
