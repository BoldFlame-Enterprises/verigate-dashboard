import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('creates and rereads an isolated event domain graph through the dashboard origin', async ({ page }) => {
  const output = process.env.COMPAT_FIXTURE_OUTPUT;
  const runId = process.env.COMPAT_RUN_ID;
  if (!output || !runId) throw new Error('Compatibility fixture output and run ID are required');
  await page.goto('/');

  const fixture = await page.evaluate(async (input) => {
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': `setup.${input.suffix}` },
      body: JSON.stringify({ email: input.email, password: input.password, client_kind: 'dashboard' }),
    });
    const loginBody = await login.json();
    if (!login.ok || !loginBody.success) throw new Error(`Administrator login failed: ${login.status}`);
    const accessToken = loginBody.data.accessToken;
    const traces: Array<Record<string, unknown>> = [];
    let operation = 0;
    async function api(path: string, init: RequestInit = {}) {
      const correlation = `setup.${input.suffix}.${++operation}`;
      const response = await fetch(`/api${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Correlation-Id': correlation,
          ...(init.headers ?? {}),
        },
      });
      const body = await response.json();
      traces.push({
        path,
        status: response.status,
        correlation_id: response.headers.get('x-correlation-id') ?? correlation,
        request_id: response.headers.get('x-request-id'),
      });
      return { response, body };
    }
    async function create(path: string, body: unknown) {
      const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
      if (!result.response.ok || !result.body.success) {
        throw new Error(`Create ${path} failed: ${result.response.status} ${result.body.error ?? ''}`);
      }
      return result.body.data;
    }

    const usersResult = await api('/users?limit=200');
    const users = usersResult.body.data as Array<{ id: number; email: string }>;
    const attendee = users.find((user) => user.email === 'vip@test.com');
    const scanner = users.find((user) => user.email === 'scanner@test.com');
    if (!attendee || !scanner) throw new Error('Disposable seed users are unavailable');

    const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const event = await create('/events', {
      name: `Compatibility Event ${input.suffix}`,
      slug: `compat-${input.suffix}`,
      description: 'Disposable compatibility fixture',
      starts_at: startsAt,
      ends_at: endsAt,
    });
    const otherEvent = await create('/events', {
      name: `Isolation Event ${input.suffix}`,
      slug: `isolation-${input.suffix}`,
      starts_at: startsAt,
      ends_at: endsAt,
    });
    const createdUser = await create('/users', {
      email: `created-${input.suffix}@example.test`,
      name: 'Compatibility Created User',
      phone: '10000000001',
      role: 'user',
    });
    await create(`/events/${event.id}/members`, { user_id: attendee.id, role_in_event: 'attendee' });
    await create(`/events/${event.id}/members`, { user_id: scanner.id, role_in_event: 'scanner' });
    const level = await create('/access', {
      event_id: event.id,
      name: 'Compatibility Access',
      priority: 50,
    });
    const authorizedArea = await create('/areas', {
      event_id: event.id,
      name: 'Authorized Gate',
      requires_scan: true,
    });
    const deniedArea = await create('/areas', {
      event_id: event.id,
      name: 'Unassigned Gate',
      requires_scan: true,
    });
    const otherArea = await create('/areas', {
      event_id: otherEvent.id,
      name: 'Other Event Gate',
      requires_scan: true,
    });
    const assignment = await create('/access/assignments', {
      event_id: event.id,
      user_id: attendee.id,
      access_level_id: level.id,
      area_id: authorizedArea.id,
      valid_from: startsAt,
      valid_until: endsAt,
    });
    const crossEvent = await api('/access/assignments', {
      method: 'POST',
      body: JSON.stringify({
        event_id: otherEvent.id,
        user_id: attendee.id,
        access_level_id: level.id,
        area_id: otherArea.id,
      }),
    });
    const reread = await Promise.all([
      api(`/events/${event.id}`),
      api(`/areas?event_id=${event.id}`),
      api(`/access?event_id=${event.id}`),
      api(`/access/assignments/list?event_id=${event.id}`),
    ]);
    return {
      event_id: Number(event.id),
      other_event_id: Number(otherEvent.id),
      created_user_id: Number(createdUser.id),
      attendee_user_id: attendee.id,
      scanner_user_id: scanner.id,
      access_level_id: Number(level.id),
      authorized_area_id: Number(authorizedArea.id),
      denied_area_id: Number(deniedArea.id),
      other_area_id: Number(otherArea.id),
      assignment_id: Number(assignment.id),
      cross_event_status: crossEvent.response.status,
      reread_success: reread.every((entry) => entry.response.ok && entry.body.success),
      traces,
    };
  }, {
    email: process.env.COMPAT_ADMIN_EMAIL!,
    password: process.env.COMPAT_ADMIN_PASSWORD!,
    suffix: runId.slice(-8),
  });

  expect(fixture.cross_event_status).toBe(400);
  expect(fixture.reread_success).toBe(true);
  expect(fixture.traces.every((trace) => trace.request_id && trace.correlation_id)).toBe(true);
  await fs.writeFile(output, JSON.stringify(fixture, null, 2) + '\n');
});
