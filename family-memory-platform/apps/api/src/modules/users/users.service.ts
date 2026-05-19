import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  notImplemented(action: string) {
    return { message: `Users.${action} — skeleton`, status: 'skeleton' };
  }
}
