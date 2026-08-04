import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  API_BASE_URL,
  downloadAuthenticatedCsv,
  resolveApiBaseUrl,
  tokenStorage,
} from './api';

afterEach(() => {
  tokenStorage.clear();
  vi.restoreAllMocks();
});

describe('browser token storage', () => {
  it('keeps access and CSRF values out of persistent browser storage', () => {
    tokenStorage.setTokens('access-token');
    tokenStorage.setCsrfToken('csrf-token');

    expect(tokenStorage.getAccessToken()).toBe('access-token');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('browser API origin configuration', () => {
  it('uses the same-origin API path when no deployment override is embedded', () => {
    expect(API_BASE_URL).toBe('/api');
    expect(resolveApiBaseUrl(undefined)).toBe('/api');
    expect(resolveApiBaseUrl('  ')).toBe('/api');
  });

  it('accepts HTTPS external APIs and explicit loopback development APIs', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api')).toBe(
      'https://api.example.com/api'
    );
    expect(resolveApiBaseUrl('http://localhost:3000/api/')).toBe(
      'http://localhost:3000/api'
    );
  });

  it('rejects unsafe or ambiguous external API overrides', () => {
    expect(() => resolveApiBaseUrl('http://api.example.com/api')).toThrow(/HTTPS/);
    expect(() => resolveApiBaseUrl('https://user:pass@api.example.com/api')).toThrow(
      /credentials/
    );
    expect(() => resolveApiBaseUrl('https://api.example.com/v1')).toThrow(/\/api/);
    expect(() => resolveApiBaseUrl('//api.example.com/api')).toThrow(/same-origin/);
  });
});

describe('authenticated CSV downloads', () => {
  it('refuses JSON error responses instead of downloading them as CSV', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: vi.fn().mockResolvedValue({ error: 'Export is too large' }),
    }));

    await expect(downloadAuthenticatedCsv('/users/export/csv', 'users.csv'))
      .rejects.toThrow('Export is too large');
  });

  it('downloads only a successful CSV response', async () => {
    tokenStorage.setTokens('access-token');
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/csv; charset=utf-8' },
      blob: vi.fn().mockResolvedValue(new Blob(['"id"\r\n"1"\r\n'])),
    }));
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });

    await downloadAuthenticatedCsv('/users/export/csv', 'users.csv');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/export/csv'),
      { headers: { Authorization: 'Bearer access-token' } },
    );
    expect(click).toHaveBeenCalled();
  });
});
