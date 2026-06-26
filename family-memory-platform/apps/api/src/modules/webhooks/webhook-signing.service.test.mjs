/**
 * Unit tests for WebhookSigningService HMAC verify (PROMPT 5-F).
 * Run: node --test apps/api/src/modules/webhooks/webhook-signing.service.test.mjs
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

function stableStringify(value) {
  return JSON.stringify(value, (_key, current) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return Object.keys(current)
        .sort()
        .reduce((acc, key) => {
          acc[key] = current[key];
          return acc;
        }, {});
    }
    return current;
  });
}

function buildSignedRequest(secret, eventId, workspaceId, eventType, payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const envelope = {
    id: eventId,
    type: eventType,
    createdAt: new Date(timestamp * 1000).toISOString(),
    workspaceId,
    data: payload,
  };
  const body = stableStringify(envelope);
  const signedPayload = `${timestamp}.${body}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return { body, timestamp, signature: `sha256=${signature}` };
}

function verifySignature({ secret, body, timestamp, signatureHeader, toleranceSeconds = 300 }) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;
  const signedPayload = `${timestamp}.${body}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const provided = signatureHeader.replace(/^sha256=/, '');
  return expected === provided;
}

test('HMAC verify accepts valid signature', () => {
  const secret = 'whsec_test_secret_12345';
  const { body, timestamp, signature } = buildSignedRequest(
    secret,
    'evt_1',
    'ws_1',
    'person.created',
    { personId: 'p1' },
  );
  assert.equal(
    verifySignature({ secret, body, timestamp, signatureHeader: signature }),
    true,
  );
});

test('HMAC verify rejects tampered body', () => {
  const secret = 'whsec_test_secret_12345';
  const { body, timestamp, signature } = buildSignedRequest(
    secret,
    'evt_1',
    'ws_1',
    'person.created',
    { personId: 'p1' },
  );
  const tampered = body.replace('p1', 'p2');
  assert.equal(
    verifySignature({ secret, body: tampered, timestamp, signatureHeader: signature }),
    false,
  );
});

test('HMAC verify rejects expired timestamp', () => {
  const secret = 'whsec_test_secret_12345';
  const { body, signature } = buildSignedRequest(secret, 'evt_1', 'ws_1', 'ping', {});
  const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
  assert.equal(
    verifySignature({
      secret,
      body,
      timestamp: oldTimestamp,
      signatureHeader: signature,
      toleranceSeconds: 300,
    }),
    false,
  );
});
