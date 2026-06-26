import { test, expect } from '@playwright/test';

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000/api/v1';
const EMAIL = process.env.SMOKE_EMAIL ?? 'admin@example.local';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Test12345!';

async function loginToken(request: import('@playwright/test').APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  if (body.mfaRequired) test.skip(true, 'MFA enabled for smoke user');
  return body.accessToken as string;
}

test.describe('BLOCK 5 integrations', () => {
  test('archives search page loads', async ({ page }) => {
    await page.goto('/en/archives/search');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('export page loads templates', async ({ page }) => {
    await page.goto('/en/export');
    await expect(page.locator('body')).toContainText(/export|book|poster/i);
  });

  test('cemeteries map page loads', async ({ page }) => {
    await page.goto('/en/cemeteries/map');
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings webhooks page loads', async ({ page }) => {
    await page.goto('/en/settings/webhooks');
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings branding page loads', async ({ page }) => {
    await page.goto('/en/settings/branding');
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings dna page loads', async ({ page }) => {
    await page.goto('/en/settings/dna');
    await expect(page.locator('body')).toBeVisible();
  });

  test('API smoke: webhooks endpoints', async ({ request }) => {
    const token = await loginToken(request);
    const res = await request.get(`${API}/webhooks/endpoints`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('API smoke: external archives providers', async ({ request }) => {
    const token = await loginToken(request);
    const res = await request.get(`${API}/external-archives/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('API smoke: cemetery map', async ({ request }) => {
    const token = await loginToken(request);
    const res = await request.get(`${API}/cemetery/map`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});
