/**
 * DTO interfaces — validation classes live in apps/api (class-validator).
 * These are TypeScript contracts for frontend forms and API responses.
 */

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string;
}

export interface CreatePersonDto {
  givenName: string;
  patronymic?: string;
  familyName?: string;
  gender?: string;
  birthDate?: string;
  deathDate?: string;
  biography?: string;
}
