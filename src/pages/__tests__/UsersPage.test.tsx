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
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../context/EventContext', () => ({
  useEvent: () => ({
    selectedEvent: {
      id: 7,
      name: 'VeriGate Demo Event',
    },
  }),
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

function cursorPage<T>(items: T[], nextCursor: string | null = null) {
  return { items, has_more: nextCursor !== null, next_cursor: nextCursor };
}

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
        return { data: { success: true, data: cursorPage([]) } } as never;
      }
      const limit = Number(config?.params?.limit ?? 50);
      const start = config?.params?.cursor === 'users-2' ? 50 : 0;
      return {
        data: {
          success: true,
          data: cursorPage(users.slice(start, start + limit), start === 0 ? 'users-2' : null),
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
    expect(screen.getByText(/Page 2 · 1 users shown/)).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/users', expect.objectContaining({
      params: expect.objectContaining({ cursor: 'users-2', limit: 50 }),
    })));
  }, 10_000);

  it('requires a reason and uses the versioned lifecycle endpoint to suspend access', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend User 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Suspend User 1' });
    const submit = within(dialog).getByRole('button', { name: 'Confirm account change' });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Reason'), {
      target: { value: 'Temporary access investigation' },
    });
    fireEvent.click(submit);

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/1/status', {
      status: 'suspended',
      expected_status: 'active',
      reason: 'Temporary access investigation',
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
    is_event_admin: true,
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
            data: cursorPage([globalAdministrator, eventAdministrator]),
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
            data: cursorPage([{
              id: 11,
              user_id: eventAdministrator.id,
              name: eventAdministrator.name,
              email: eventAdministrator.email,
              role: 'user',
              role_in_event: 'admin',
              is_active: true,
              joined_at: '2026-01-02T00:00:00.000Z',
            }]),
          },
        } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    renderPage();

    expect(await screen.findByRole('columnheader', {
      name: /selected event authority verigate demo event/i,
    })).toBeInTheDocument();
    const globalRow = screen.getByRole('row', { name: /global operator/i });
    expect(within(globalRow).getByText('Global administrator')).toBeInTheDocument();
    expect(within(globalRow).getByText('Administrator via global role')).toBeInTheDocument();
    const eventAdministratorRow = screen.getByRole('row', { name: /event operator/i });
    expect(within(eventAdministratorRow).getByText('Standard user')).toBeInTheDocument();
    expect(await within(eventAdministratorRow).findByText('Event administrator')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Event administration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: /manage global operator event administrator access/i,
    })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {
      name: /manage event operator event administrator access/i,
    }));

    const dialog = await screen.findByRole('dialog', {
      name: /manage event access for event operator/i,
    });
    expect(await within(dialog).findByText('Event administrator')).toBeInTheDocument();
    expect(within(dialog).getByText(
      /current authority for verigate demo event/i
    )).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('grants event-administrator membership to an eligible active user', async () => {
    let membershipGranted = false;
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/users') {
        return {
          data: {
            success: true,
            data: cursorPage([
              globalAdministrator,
              { ...standardUser, is_event_admin: membershipGranted },
            ]),
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
            data: cursorPage(membershipGranted ? [{
              id: 12,
              user_id: standardUser.id,
              name: standardUser.name,
              email: standardUser.email,
              role: 'user',
              role_in_event: 'admin',
              is_active: true,
              joined_at: '2026-01-02T00:00:00.000Z',
            }] : []),
          },
        } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    vi.mocked(api.post).mockImplementation(async () => {
      membershipGranted = true;
      return { data: { success: true, data: { id: 12 } } } as never;
    });

    renderPage();

    const standardUserRow = await screen.findByRole('row', { name: /standard user/i });
    expect(within(standardUserRow).getByText('No admin access')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', {
      name: /manage standard user event administrator access/i,
    }));
    const dialog = await screen.findByRole('dialog', {
      name: /manage event access for standard user/i,
    });
    fireEvent.click(await within(dialog).findByRole('button', {
      name: /grant event administrator access/i,
    }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/events/7/members', {
      user_id: standardUser.id,
      role_in_event: 'admin',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /standard user can now administer verigate demo event/i
    );
    expect(await within(standardUserRow).findByText('Event administrator')).toBeInTheDocument();
  });

  it('requires confirmation before removing event-administrator membership', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/users') {
        return {
          data: {
            success: true,
            data: cursorPage([eventAdministrator]),
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
            data: cursorPage([{
              id: 11,
              user_id: eventAdministrator.id,
              name: eventAdministrator.name,
              email: eventAdministrator.email,
              role: 'user',
              role_in_event: 'admin',
              is_active: true,
              joined_at: '2026-01-02T00:00:00.000Z',
            }]),
          },
        } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', {
      name: /manage event operator event administrator access/i,
    }));
    const dialog = await screen.findByRole('dialog', {
      name: /manage event access for event operator/i,
    });
    fireEvent.click(await within(dialog).findByRole('button', {
      name: 'Remove event administrator access',
    }));
    expect(api.delete).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm removal' }));

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
            data: cursorPage([standardUser]),
          },
        } as never;
      }
      if (path === '/events') {
        return { data: { success: true, data: [event] } } as never;
      }
      if (path === '/events/7/members') {
        return { data: { success: true, data: cursorPage([]) } } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    vi.mocked(api.post).mockRejectedValue(apiError('Membership update was rejected'));

    renderPage();

    fireEvent.click(await screen.findByRole('button', {
      name: /manage standard user event administrator access/i,
    }));
    const dialog = await screen.findByRole('dialog', {
      name: /manage event access for standard user/i,
    });
    fireEvent.click(await within(dialog).findByRole('button', {
      name: /grant event administrator access/i,
    }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/membership update was rejected/i);
    expect(within(dialog).getByRole('button', {
      name: /grant event administrator access/i,
    })).toBeEnabled();
  });
});
