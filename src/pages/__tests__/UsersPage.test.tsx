import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const event = {
  id: 7,
  name: 'VeriGate Demo Event',
  slug: 'verigate-demo-event',
  description: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  administration_scope: 'global',
  capabilities: ['manage_event_devices', 'manage_operational_cases'],
};

function apiError(error: string): AxiosError {
  const failure = new AxiosError('Request failed with status code 400');
  failure.response = {
    status: 400,
    data: { success: false, error },
  } as AxiosResponse;
  return failure;
}

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
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (path, config) => {
      if (path === '/events') {
        return { data: { success: true, data: [event] } } as never;
      }
      if (path === '/events/7/members') {
        return { data: { success: true, data: [] } } as never;
      }
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

describe('event administration membership management', () => {
  const globalAdministrator = {
    ...users[0],
    id: 1,
    name: 'Global Operator',
    email: 'global@example.com',
    role: 'admin',
  };
  const eventAdministrator = {
    ...users[1],
    id: 2,
    name: 'Event Operator',
    email: 'event@example.com',
    role: 'user',
  };
  const standardUser = {
    ...users[2],
    id: 3,
    name: 'Standard User',
    email: 'standard@example.com',
    role: 'user',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { id: 11 } },
    } as never);
    vi.mocked(api.delete).mockResolvedValue({
      data: { success: true, data: { id: 11 } },
    } as never);
  });

  it('distinguishes global authority from event-scoped administration', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/users') {
        return {
          data: {
            success: true,
            data: [globalAdministrator, eventAdministrator],
            pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
          },
        } as never;
      }
      if (path === '/events') {
        return { data: { success: true, data: [event] } } as never;
      }
      if (path === '/events/7/members') {
        return {
          data: {
            success: true,
            data: [{
              id: 11,
              user_id: eventAdministrator.id,
              name: eventAdministrator.name,
              email: eventAdministrator.email,
              role: 'user',
              role_in_event: 'admin',
              is_active: true,
              joined_at: '2026-01-02T00:00:00.000Z',
            }],
          },
        } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    renderPage();

    expect(await screen.findByText('Global administrator')).toBeInTheDocument();
    expect(await screen.findByText('Event administrator')).toBeInTheDocument();
    expect(screen.getByText(/automatically administer every event/i)).toBeInTheDocument();

    const candidateSelect = screen.getByRole('combobox', { name: /person to grant access/i });
    expect(within(candidateSelect).queryByRole('option', { name: /global@example.com/i })).not.toBeInTheDocument();
  });

  it('grants event-administrator membership to an eligible active user', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/users') {
        return {
          data: {
            success: true,
            data: [globalAdministrator, standardUser],
            pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
          },
        } as never;
      }
      if (path === '/events') {
        return { data: { success: true, data: [event] } } as never;
      }
      if (path === '/events/7/members') {
        return { data: { success: true, data: [] } } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: /person to grant access/i }), {
      target: { value: String(standardUser.id) },
    });
    fireEvent.click(screen.getByRole('button', { name: /grant event administrator access/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/events/7/members', {
      user_id: standardUser.id,
      role_in_event: 'admin',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /standard user can now administer verigate demo event/i
    );
  });

  it('requires confirmation before removing event-administrator membership', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/users') {
        return {
          data: {
            success: true,
            data: [eventAdministrator],
            pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
          },
        } as never;
      }
      if (path === '/events') {
        return { data: { success: true, data: [event] } } as never;
      }
      if (path === '/events/7/members') {
        return {
          data: {
            success: true,
            data: [{
              id: 11,
              user_id: eventAdministrator.id,
              name: eventAdministrator.name,
              email: eventAdministrator.email,
              role: 'user',
              role_in_event: 'admin',
              is_active: true,
              joined_at: '2026-01-02T00:00:00.000Z',
            }],
          },
        } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', {
      name: `Remove ${eventAdministrator.name} event access`,
    }));
    expect(api.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(
      `/events/7/members/${eventAdministrator.id}`
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /event operator no longer administers verigate demo event/i
    );
  });

  it('surfaces a recoverable membership assignment failure', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/users') {
        return {
          data: {
            success: true,
            data: [standardUser],
            pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
          },
        } as never;
      }
      if (path === '/events') {
        return { data: { success: true, data: [event] } } as never;
      }
      if (path === '/events/7/members') {
        return { data: { success: true, data: [] } } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    vi.mocked(api.post).mockRejectedValue(apiError('Membership update was rejected'));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: /person to grant access/i }), {
      target: { value: String(standardUser.id) },
    });
    fireEvent.click(screen.getByRole('button', { name: /grant event administrator access/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/membership update was rejected/i);
    expect(screen.getByRole('button', { name: /grant event administrator access/i })).toBeEnabled();
  });
});
