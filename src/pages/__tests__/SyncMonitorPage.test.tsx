import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../../lib/api';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { AuthUser, Event } from '../../types';
import SyncMonitorPage from '../SyncMonitorPage';

const { eventState, authState } = vi.hoisted(() => ({
  eventState: {
    events: [] as Event[],
    selectedEvent: {
      id: 7,
      name: 'North Gate',
      slug: 'north-gate',
      description: null,
      starts_at: null,
      ends_at: null,
      is_active: true,
      created_at: '2026-07-27T00:00:00.000Z',
      updated_at: '2026-07-27T00:00:00.000Z',
      administration_scope: 'event',
      capabilities: ['manage_event_devices'],
    } as Event,
    selectEvent: vi.fn(),
    isLoading: false,
    hasCapability: (capability: string) =>
      capability === 'manage_event_devices',
    hasAnyEventCapability: (capabilities: string[]) =>
      capabilities.includes('manage_event_devices'),
  },
  authState: {
    user: {
      id: 4,
      email: 'admin@example.com',
      name: 'Event Admin',
      phone: '5555555555',
      role: 'user',
      is_active: true,
    } as AuthUser,
    isLoading: false,
    logout: vi.fn(),
  },
}));

vi.mock('../../context/EventContext', () => ({
  useEvent: () => eventState,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SyncMonitorPage />
    </QueryClientProvider>
  );
}

const registration = {
  id: 12,
  event_id: 7,
  user_id: 20,
  user_name: 'Gate Operator',
  user_email: 'operator@example.com',
  app: 'scan',
  installation_id: 'scan-installation-12',
  platform: 'android',
  state: 'active',
  session_generation: 3,
  version: 5,
  registered_at: '2026-07-27T10:00:00.000Z',
  last_seen_at: '2026-07-27T11:58:00.000Z',
  last_sync_at: '2026-07-27T11:58:00.000Z',
  last_scan_upload_at: null,
  local_db_version: 9,
  app_version: '1.2.0',
  state_changed_at: '2026-07-27T10:00:00.000Z',
  state_changed_by: null,
  state_reason: null,
  audit_upload_until: null,
  updated_at: '2026-07-27T11:58:00.000Z',
  sync_status: 'online',
};

describe('event-scoped device controls', () => {
  beforeEach(() => {
    (api.get as ReturnType<typeof vi.fn>).mockReset();
    (api.post as ReturnType<typeof vi.fn>).mockReset();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [registration] },
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: { ...registration, state: 'deregistered', version: 6, session_generation: 4 },
      },
    });
  });

  it('loads registrations only for the selected authorized event', async () => {
    renderPage();

    expect(await screen.findByText('Gate Operator')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/devices/events/7');
    expect(screen.getByText('scan-installation-12')).toBeInTheDocument();
  });

  it('requires a reason and explicit confirmation before deregistration', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Gate Operator');

    await user.click(screen.getByRole('button', { name: 'Deregister device' }));
    expect(screen.getByText(/signs the app out/i)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Confirm deregistration' });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText('Reason for deregistration'), 'Device reassigned');
    await user.click(confirm);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/devices/events/7/registrations/12/deregister',
      {
        reason: 'Device reassigned',
        expected_version: 5,
        expected_generation: 3,
      }
    ));
  });

  it('shows the no-final-upload warning before blacklisting', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Gate Operator');

    await user.click(screen.getByRole('button', { name: 'Blacklist device' }));

    expect(screen.getByText(/no final upload will be accepted/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Reason for blacklisting')).toBeInTheDocument();
  });

  it('loads immutable action history on demand', async () => {
    const user = userEvent.setup();
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { success: true, data: [registration] } })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{
            id: 1,
            action: 'registered',
            actor_email: 'operator@example.com',
            reason: 'Device session registered',
            created_at: '2026-07-27T10:00:00.000Z',
          }],
        },
      });
    renderPage();
    await screen.findByText('Gate Operator');

    await user.click(screen.getByRole('button', { name: 'View device history' }));

    expect(await screen.findByText(/Device session registered/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/devices/events/7/registrations/12/actions');
  });

  it('reports a concurrent change and refreshes authoritative state', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: 'Device registration changed before this action completed',
          data: { current: { ...registration, state: 'blacklisted', version: 6 } },
        },
      },
    });
    renderPage();
    await screen.findByText('Gate Operator');

    await user.click(screen.getByRole('button', { name: 'Deregister device' }));
    await user.type(screen.getByLabelText('Reason for deregistration'), 'Device reassigned');
    await user.click(screen.getByRole('button', { name: 'Confirm deregistration' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/changed by another administrator/i);
    await waitFor(() => {
      expect((api.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);
    });
  });
});

describe('event administrator shell', () => {
  it('allows an event administrator into a capability route', () => {
    render(
      <MemoryRouter initialEntries={['/device-control']}>
        <Routes>
          <Route
            element={(
              <ProtectedRoute
                allowedRoles={['admin']}
                requiredCapabilities={['manage_event_devices']}
              />
            )}
          >
            <Route path="/device-control" element={<p>Authorized device control</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Authorized device control')).toBeInTheDocument();
  });

  it('shows only operational navigation to a non-global event administrator', () => {
    eventState.events = [eventState.selectedEvent];
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>Operational home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Sync Monitor/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Events' })).not.toBeInTheDocument();
  });
});
