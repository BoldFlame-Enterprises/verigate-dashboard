import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  bootstrapBrowserSession: vi.fn(),
  getAccessToken: vi.fn(),
  setTokens: vi.fn(),
  setCsrfToken: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
  bootstrapBrowserSession: apiMocks.bootstrapBrowserSession,
  tokenStorage: {
    getAccessToken: apiMocks.getAccessToken,
    setTokens: apiMocks.setTokens,
    setCsrfToken: apiMocks.setCsrfToken,
    clear: apiMocks.clear,
  },
}));

function AuthState() {
  const { isLoading, user } = useAuth();
  return (
    <div>
      <span>{isLoading ? 'loading' : 'ready'}</span>
      <span>{user?.email ?? 'anonymous'}</span>
    </div>
  );
}

function renderProvider(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AuthProvider route bootstrap', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.getAccessToken.mockReturnValue(null);
    apiMocks.bootstrapBrowserSession.mockResolvedValue(null);
  });

  it.each(['/login', '/activate', '/reset-password'])(
    'does not bootstrap browser authentication on public route %s',
    async (pathname) => {
      renderProvider(pathname);

      expect(await screen.findByText('ready')).toBeInTheDocument();
      expect(screen.getByText('anonymous')).toBeInTheDocument();
      expect(apiMocks.bootstrapBrowserSession).not.toHaveBeenCalled();
      expect(apiMocks.get).not.toHaveBeenCalled();
    },
  );

  it('still bootstraps and loads identity on a protected route', async () => {
    apiMocks.bootstrapBrowserSession.mockResolvedValue('access-token');
    apiMocks.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin',
          phone: '5555555555',
          role: 'admin',
          is_active: true,
        },
      },
    });

    renderProvider('/');

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
    expect(apiMocks.bootstrapBrowserSession).toHaveBeenCalledTimes(1);
    expect(apiMocks.get).toHaveBeenCalledWith('/users/me');
  });
});
