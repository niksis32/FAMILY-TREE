import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
