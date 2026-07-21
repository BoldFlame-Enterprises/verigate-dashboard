import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersPage from '../UsersPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  API_BASE_URL: 'http://test/api',
  tokenStorage: { getAccessToken: () => 'token' },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const users = Array.from({ length: 51 }, (_, index) => ({
  id: index + 1,
  name: `User ${index + 1}`,
  email: `user${index + 1}@example.com`,
  phone: '1234567890',
  role: 'user',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>
  );
}

describe('UsersPage pagination', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (_path, config) => {
      const page = Number(config?.params?.page ?? 1);
      const limit = Number(config?.params?.limit ?? 50);
      const start = (page - 1) * limit;
      return {
        data: {
          success: true,
          data: users.slice(start, start + limit),
          pagination: { page, limit, total: users.length, totalPages: 2 },
        },
      } as never;
    });
  });

  it('makes a user beyond the first server page reachable', async () => {
    renderPage();
    expect(await screen.findByText('User 1')).toBeInTheDocument();
    expect(screen.queryByText('User 51')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('User 51')).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 2 · 51 users/)).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/users', {
      params: { page: 2, limit: 50, search: undefined },
    }));
  });
});
