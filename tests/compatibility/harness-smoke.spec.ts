import { expect, test } from '@playwright/test';

test('serves the production dashboard and same-origin API', async ({ page }) => {
  const runId = process.env.COMPAT_RUN_ID;
  expect(runId).toMatch(/^run-/);

  const documentResponse = await page.goto('/');
  expect(documentResponse?.status()).toBe(200);
  await expect(page.locator('#root')).toBeAttached();

  const correlationId = `browser.${runId?.slice(-8)}`;
  const apiResult = await page.evaluate(async (correlation) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlation,
      },
      body: '{}',
    });
    return {
      status: response.status,
      body: await response.json(),
      requestId: response.headers.get('x-request-id'),
      correlationId: response.headers.get('x-correlation-id'),
    };
  }, correlationId);

  expect(apiResult.status).toBe(400);
  expect(apiResult.body).toMatchObject({ success: false, error: 'Validation failed' });
  expect(apiResult.requestId).toMatch(/^[A-Fa-f0-9-]{36}$/);
  expect(apiResult.correlationId).toBe(correlationId);
});
