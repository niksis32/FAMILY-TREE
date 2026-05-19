import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  notImplemented(action: string) {
    return { message: `Auth.${action} — implement in iteration 2`, status: 'skeleton' };
  }
}
