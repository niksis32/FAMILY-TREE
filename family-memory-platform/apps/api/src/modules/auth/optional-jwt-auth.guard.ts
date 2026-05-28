import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from './current-user.decorator';

interface JwtPayload extends AuthenticatedUser {
  sub: string;
}

/** Sets request.user when Bearer token is valid; does not reject anonymous requests. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: AuthenticatedUser }>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return true;
    }

    const token = header.slice('Bearer '.length).trim();
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) return true;

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret });
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      // treat as anonymous
    }

    return true;
  }
}
