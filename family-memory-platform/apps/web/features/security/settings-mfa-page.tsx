'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Input } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { api, formatApiError } from '@/lib/api-client';
import { startPasskeyRegistration } from '@/lib/webauthn-client';
import type { WebAuthnCredentialSummary } from '@family/shared';

export function SettingsMfaPage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [status, setStatus] = useState<string | null>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [passkeys, setPasskeys] = useState<WebAuthnCredentialSummary[]>([]);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [deviceName, setDeviceName] = useState('');

  const reload = useCallback(async () => {
    if (!token) return;
    const mfaStatus = await api.mfa.status(token);
    setTotpEnabled(mfaStatus.totpEnabled);
    setPasskeyCount(mfaStatus.passkeyCount);
    const list = await api.mfa.listPasskeys(token);
    setPasskeys(list);
  }, [token]);

  useEffect(() => {
    void reload().catch((error) => setStatus(formatApiError(error)));
  }, [reload]);

  async function startTotp() {
    if (!token) return;
    setStatus(null);
    setRecoveryCodes(null);
    try {
      const result = await api.mfa.enrollStart(token);
      setEnrollSecret(result.secret);
      setStatus('Отсканируйте otpauth URL в приложении-аутентификаторе и введите код.');
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  async function verifyTotp() {
    if (!token || !verifyCode.trim()) return;
    setStatus(null);
    try {
      const result = await api.mfa.enrollVerify(verifyCode.trim(), token);
      setRecoveryCodes(result.recoveryCodes);
      setEnrollSecret(null);
      setVerifyCode('');
      setTotpEnabled(true);
      setStatus('TOTP включён. Сохраните recovery codes.');
      await reload();
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  async function enrollPasskey() {
    if (!token) return;
    if (!window.PublicKeyCredential) {
      setStatus('WebAuthn не поддерживается в этом браузере.');
      return;
    }
    setStatus('Ожидаем подтверждение passkey…');
    try {
      const options = await api.mfa.passkeyRegisterOptions(token);
      const response = await startPasskeyRegistration(options as Record<string, unknown>);
      await api.mfa.passkeyRegisterVerify(response, token, deviceName.trim() || undefined);
      setStatus('Passkey зарегистрирован.');
      setDeviceName('');
      await reload();
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  if (!token) {
    return <p className="text-sm text-stone-500">Войдите в аккаунт для настройки MFA.</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Безопасность и MFA"
        description="TOTP, recovery codes и passkeys (WebAuthn) для входа."
      />

      <Card>
        <h2 className="text-lg font-semibold">TOTP</h2>
        <p className="mt-1 text-sm text-stone-500">
          Статус: {totpEnabled ? 'включён' : 'выключен'}
        </p>
        {!totpEnabled ? (
          <div className="mt-4 space-y-3">
            <Button type="button" onClick={() => void startTotp()}>
              Начать настройку TOTP
            </Button>
            {enrollSecret ? (
              <p className="break-all rounded bg-stone-100 p-3 text-xs dark:bg-slate-900">{enrollSecret}</p>
            ) : null}
            {enrollSecret ? (
              <>
                <Input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="6-значный код" />
                <Button type="button" onClick={() => void verifyTotp()}>
                  Подтвердить TOTP
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {recoveryCodes ? (
          <ul className="mt-4 space-y-1 rounded bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            {recoveryCodes.map((code) => (
              <li key={code} className="font-mono">
                {code}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Passkeys</h2>
        <p className="mt-1 text-sm text-stone-500">Зарегистрировано: {passkeyCount}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Имя устройства (необязательно)"
            className="max-w-xs"
          />
          <Button type="button" onClick={() => void enrollPasskey()}>
            Добавить passkey
          </Button>
        </div>
        {passkeys.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {passkeys.map((pk) => (
              <li key={pk.id} className="rounded border px-3 py-2 dark:border-slate-800">
                {pk.deviceName ?? 'Passkey'} — {new Date(pk.createdAt).toLocaleDateString('ru-RU')}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {status ? <p className="text-sm text-stone-600 dark:text-slate-300">{status}</p> : null}
    </div>
  );
}
