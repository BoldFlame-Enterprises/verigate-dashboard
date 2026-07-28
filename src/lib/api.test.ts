import { afterEach, describe, expect, it } from 'vitest';
import { tokenStorage } from './api';

afterEach(() => tokenStorage.clear());

describe('browser token storage', () => {
  it('keeps access and CSRF values out of persistent browser storage', () => {
    tokenStorage.setTokens('access-token');
    tokenStorage.setCsrfToken('csrf-token');

    expect(tokenStorage.getAccessToken()).toBe('access-token');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
