import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import axe from 'axe-core';

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
  eventId: number,
  selectEvent = true
) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('password123');
  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/auth/login')
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  const loginBody = await (await loginResponse).json();
  await expect(page).not.toHaveURL(/\/login$/);
  if (selectEvent) {
    await expect(page.getByLabel('Event')).toBeVisible();
    await page.getByLabel('Event').selectOption(String(eventId));
  }
  return String(loginBody.data.accessToken);
}

async function spaNavigate(page: import('@playwright/test').Page, target: string) {
  await page.evaluate((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, target);
  await expect(page).toHaveURL(new RegExp(`${target.replace('/', '\\/')}$`));
}

test('revokes access and reviews event-isolated operational records in the real dashboard', async ({ browser, page }) => {
  const inputPath = process.env.COMPAT_CONVERGENCE_INPUT;
  const outputPath = process.env.COMPAT_DASHBOARD_CONVERGENCE_OUTPUT;
  if (!inputPath || !outputPath) throw new Error('Dashboard convergence paths are required');
  const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  const eventId = Number(input.fixture.event_id);
  const otherEventId = Number(input.fixture.other_event_id);
  if (!Number.isSafeInteger(eventId) || !Number.isSafeInteger(otherEventId)) {
    throw new Error('Dashboard convergence event IDs are invalid');
  }

  await signIn(page, 'admin@test.com', eventId);
  await spaNavigate(page, '/access');
  const revokeResponse = page.waitForResponse((response) =>
    response.request().method() === 'DELETE' &&
    response.url().includes(`/api/access/assignments/${input.fixture.assignment_id}`)
  );
  await page.getByRole('button', { name: "Revoke VIP Guest's assignment" }).click();
  const revoked = await revokeResponse;
  expect(revoked.status()).toBe(200);

  await spaNavigate(page, '/incidents');
  const incidentDescription = `Compatibility offline incident ${input.run_id}`;
  const overrideReason = `Compatibility identity evidence ${input.run_id}`;
  await expect(page.getByText(incidentDescription)).toBeVisible();
  await expect(page.getByText(overrideReason)).toBeVisible();
  await expect(page.getByText('Authorized Gate').first()).toBeVisible();

  await page.getByLabel('Event').selectOption(String(otherEventId));
  await expect(page.getByText(incidentDescription)).toHaveCount(0);
  await expect(page.getByText(`Compatibility isolated incident ${input.run_id}`)).toBeVisible();

  const unauthorizedContext = await browser.newContext();
  const unauthorizedPage = await unauthorizedContext.newPage();
  const unauthorizedAccess = await signIn(unauthorizedPage, 'vip@test.com', eventId, false);
  const deniedStatus = await unauthorizedPage.evaluate(async ({ id, access }) => {
    const response = await fetch(`/api/incidents?event_id=${id}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    return response.status;
  }, { id: eventId, access: unauthorizedAccess });
  expect([403, 404]).toContain(deniedStatus);
  await unauthorizedContext.close();

  await fs.writeFile(outputPath, JSON.stringify({
    revoke_status: revoked.status(),
    revoke_request_id: revoked.headers()['x-request-id'],
    revoke_correlation_id: revoked.headers()['x-correlation-id'],
    incident_visible: true,
    override_visible: true,
    other_event_isolated: true,
    unauthorized_status: deniedStatus,
  }, null, 2) + '\n');
});

test('keeps authenticated operation accessible at narrow width and browser zoom', async ({ page }) => {
  const inputPath = process.env.COMPAT_CONVERGENCE_INPUT;
  if (!inputPath) throw new Error('Dashboard convergence input is required');
  const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  const eventId = Number(input.fixture.event_id);
  if (!Number.isSafeInteger(eventId)) throw new Error('Dashboard convergence event ID is invalid');

  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page, 'admin@test.com', eventId);

  const menu = page.getByRole('button', { name: 'Open navigation' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await spaNavigate(page, '/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Assignments by access level' }).or(
    page.getByText('No assignments yet')
  )).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  for (const zoom of [2, 4]) {
    const fits = await page.evaluate((scale) => {
      document.documentElement.style.setProperty('zoom', String(scale));
      return document.body.scrollWidth <= document.documentElement.clientWidth + 1;
    }, zoom);
    expect(fits, `dashboard should not overflow horizontally at ${zoom * 100}% zoom`).toBe(true);
  }
  await page.evaluate(() => document.documentElement.style.removeProperty('zoom'));

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const runner = (window as typeof window & {
      axe: { run: (root: Document, options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null }> }> };
    }).axe;
    const result = await runner.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    });
    return result.violations;
  });
  expect(violations).toEqual([]);
});
