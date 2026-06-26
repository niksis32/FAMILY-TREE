/** Minimal WebAuthn helpers for passkey enroll/login (pairs with @simplewebauthn/server). */

function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64URLToBuffer(base64URLString: string): ArrayBuffer {
  const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const str = atob(base64 + pad);
  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i);
  return buffer;
}

export async function startPasskeyRegistration(options: Record<string, unknown>) {
  const opts = options as unknown as PublicKeyCredentialCreationOptions & {
    challenge: string;
    user: { id: string; name: string; displayName: string };
    excludeCredentials?: Array<{ id: string; type: string; transports?: AuthenticatorTransport[] }>;
  };
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...opts,
    challenge: base64URLToBuffer(String(opts.challenge)),
    user: {
      ...opts.user,
      id: base64URLToBuffer(String(opts.user.id)),
    },
    excludeCredentials: (opts.excludeCredentials ?? []).map((cred) => ({
      ...cred,
      id: base64URLToBuffer(cred.id),
      type: 'public-key' as const,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey registration cancelled');

  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      attestationObject: bufferToBase64URL(response.attestationObject),
      transports: response.getTransports?.(),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export async function startPasskeyAuthentication(options: Record<string, unknown>) {
  const opts = options as unknown as PublicKeyCredentialRequestOptions & {
    challenge: string;
    allowCredentials?: Array<{ id: string; type: string; transports?: AuthenticatorTransport[] }>;
  };
  const publicKey: PublicKeyCredentialRequestOptions = {
    ...opts,
    challenge: base64URLToBuffer(String(opts.challenge)),
    allowCredentials: (opts.allowCredentials ?? []).map((cred) => ({
      ...cred,
      id: base64URLToBuffer(cred.id),
      type: 'public-key' as const,
    })),
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey authentication cancelled');

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      authenticatorData: bufferToBase64URL(response.authenticatorData),
      signature: bufferToBase64URL(response.signature),
      userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
