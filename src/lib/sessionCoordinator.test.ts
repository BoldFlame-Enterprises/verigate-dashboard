import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  coordinateSessionRefresh,
  resetSessionCoordinatorForTests,
} from './sessionCoordinator';

afterEach(() => {
  resetSessionCoordinatorForTests();
});

describe('browser session refresh coordination', () => {
  it('coalesces concurrent refreshes without persisting bearer credentials', async () => {
    const refresh = vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      csrfToken: 'csrf-token',
    });

    const [first, second] = await Promise.all([
      coordinateSessionRefresh(refresh),
      coordinateSessionRefresh(refresh),
    ]);

    expect(first).toEqual(second);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(localStorage)).not.toContain('access-token');
    expect(JSON.stringify(localStorage)).not.toContain('csrf-token');
  });
});
