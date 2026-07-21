import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccessPage from '../AccessPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../context/EventContext', () => ({
  useEvent: () => ({ selectedEvent: { id: 7, name: 'Test event' } }),
}));

const users = Array.from({ length: 51 }, (_, index) => ({
  id: index + 1,
  name: `Directory User ${index + 1}`,
  email: `directory${index + 1}@example.com`,
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
      <AccessPage />
    </QueryClientProvider>
  );
}

describe('AccessPage assignment directory', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (path, config) => {
      if (path === '/users') {
        const page = Number(config?.params?.page ?? 1);
        const limit = Number(config?.params?.limit ?? 25);
        const start = (page - 1) * limit;
        return {
          data: {
            success: true,
            data: users.slice(start, start + limit),
            pagination: { page, limit, total: users.length, totalPages: 3 },
          },
        } as never;
      }
      if (path === '/access') {
        return { data: { success: true, data: [{ id: 1, event_id: 7, name: 'VIP', priority: 10, is_active: true }] } } as never;
      }
      if (path === '/areas') {
        return { data: { success: true, data: [{ id: 2, event_id: 7, name: 'Arena', requires_scan: true, is_active: true }] } } as never;
      }
      return { data: { success: true, data: [] } } as never;
    });
  });

  it('pages through all users in the assignment picker', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Assign access/i }));

    expect(await screen.findByRole('option', { name: /^Directory User 1 ·/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next users' }));
    expect(await screen.findByRole('option', { name: /^Directory User 26 ·/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next users' }));
    expect(await screen.findByRole('option', { name: /^Directory User 51 ·/ })).toBeInTheDocument();

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/users', {
      params: { page: 3, limit: 25, search: undefined, is_active: true },
    }));
  });
});
