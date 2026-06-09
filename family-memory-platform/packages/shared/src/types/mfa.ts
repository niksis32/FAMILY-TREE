export type MfaLoginStep = 'password' | 'mfa_required' | 'complete';

export interface MfaEnrollStartResult {
  secret: string;
  otpauthUrl: string;
  qrDataUrl?: string;
}

export interface MfaEnrollVerifyResult {
  recoveryCodes: string[];
  enabled: boolean;
}

export interface MfaLoginChallengeResult {
  mfaRequired: true;
  mfaSessionToken: string;
  methods: Array<'totp' | 'recovery' | 'passkey'>;
}

export interface WebAuthnCredentialSummary {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}
