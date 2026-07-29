import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Plus,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api, APIResponse, downloadAuthenticatedCsv } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { Event, EventMembership, User, UserRole } from '../types';
import { useEvent } from '../context/EventContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';

interface NewUserForm {
  email: string;
  name: string;
  phone: string;
  role: UserRole;
}

const emptyForm: NewUserForm = { email: '', name: '', phone: '', role: 'user' };

function accountAuthority(user: User) {
  if (user.role === 'admin') {
    return {
      label: 'Global administrator',
      className: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200',
    };
  }
  if (user.role === 'scanner') {
    return {
      label: 'Scanner',
      className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
    };
  }
  return {
    label: 'Standard user',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
}

function eventAuthority(
  user: User,
  state: {
    hasSelectedEvent: boolean;
    isLoading: boolean;
    isError: boolean;
    isEventAdministrator: boolean;
  }
) {
  if (user.role === 'admin') {
    return {
      label: 'Administrator via global role',
      className: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200',
    };
  }
  if (!user.is_active) {
    return {
      label: 'Inactive account',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    };
  }
  if (!state.hasSelectedEvent) {
    return {
      label: 'No event selected',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    };
  }
  if (state.isLoading) {
    return {
      label: 'Checking access...',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    };
  }
  if (state.isError) {
    return {
      label: 'Access unavailable',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    };
  }
  if (state.isEventAdministrator) {
    return {
      label: 'Event administrator',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    };
  }
  return {
    label: 'No admin access',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { selectedEvent } = useEvent();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [membershipEventId, setMembershipEventId] = useState<number | null>(null);
  const [membershipMessage, setMembershipMessage] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const accessTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const membershipMutationPendingRef = useRef(false);

  const { data: usersPage, isLoading, isError } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: async () => {
      const res = await api.get<APIResponse<User[]>>('/users', {
        params: { page, limit: 50, search: search || undefined },
      });
      return {
        users: res.data.data ?? [],
        pagination: res.data.pagination ?? { page, limit: 50, total: 0, totalPages: 1 },
      };
    },
  });
  const users = useMemo(() => usersPage?.users ?? [], [usersPage?.users]);
  const pagination = usersPage?.pagination;

  const {
    data: selectedEventMemberships = [],
    isLoading: selectedEventMembershipsLoading,
    isError: selectedEventMembershipsError,
  } = useQuery({
    queryKey: ['event-members', selectedEvent?.id],
    queryFn: async () => {
      const res = await api.get<APIResponse<EventMembership[]>>(
        `/events/${selectedEvent!.id}/members`
      );
      return res.data.data ?? [];
    },
    enabled: selectedEvent !== null,
  });
  const selectedEventAdministratorIds = useMemo(
    () => new Set(
      selectedEventMemberships
        .filter((membership) =>
          membership.is_active && membership.role_in_event === 'admin'
        )
        .map((membership) => membership.user_id)
    ),
    [selectedEventMemberships]
  );

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await api.get<APIResponse<Event[]>>('/events');
      return res.data.data ?? [];
    },
    enabled: accessUser !== null,
  });
  const selectedMembershipEventId = membershipEventId ?? events[0]?.id ?? null;
  const selectedMembershipEvent = events.find(
    (event) => event.id === selectedMembershipEventId
  ) ?? null;

  const {
    data: dialogMemberships = [],
    isLoading: dialogMembershipsLoading,
    isError: dialogMembershipsError,
    refetch: refetchMemberships,
  } = useQuery({
    queryKey: ['event-members', selectedMembershipEventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<EventMembership[]>>(
        `/events/${selectedMembershipEventId}/members`
      );
      return res.data.data ?? [];
    },
    enabled: accessUser !== null && selectedMembershipEventId !== null,
  });

  const selectedUserMembership = dialogMemberships.find(
    (membership) =>
      membership.user_id === accessUser?.id &&
      membership.is_active &&
      membership.role_in_event === 'admin'
  ) ?? null;

  const createUser = useMutation({
    mutationFn: async (payload: NewUserForm) => {
      const res = await api.post<APIResponse<User & { activation_token: string }>>('/users', payload);
      if (!res.data.success) throw new Error(res.data.error);
      return res.data.data;
    },
    onSuccess: (created) => {
      setActivationToken(created?.activation_token ?? null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (err: unknown) => setFormError(getErrorMessage(err)),
  });

  const deactivateUser = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const grantEventAdministration = useMutation({
    mutationFn: async () => {
      if (!accessUser || selectedMembershipEventId === null) {
        throw new Error('Choose a user and event before granting access.');
      }
      const res = await api.post<APIResponse<EventMembership>>(
        `/events/${selectedMembershipEventId}/members`,
        { user_id: accessUser.id, role_in_event: 'admin' }
      );
      if (!res.data.success) throw new Error(res.data.error);
      return accessUser;
    },
    onSuccess: (user) => {
      setMembershipError(null);
      setConfirmRemoval(false);
      setMembershipMessage(
        `${user.name} can now administer ${selectedMembershipEvent?.name ?? 'this event'}.`
      );
      queryClient.invalidateQueries({
        queryKey: ['event-members', selectedMembershipEventId],
      });
    },
    onError: (error: unknown) => {
      setMembershipMessage(null);
      setMembershipError(getErrorMessage(error));
    },
  });

  const removeEventAdministration = useMutation({
    mutationFn: async () => {
      if (!accessUser || !selectedUserMembership || selectedMembershipEventId === null) {
        throw new Error('Choose an active event assignment before removing access.');
      }
      await api.delete(
        `/events/${selectedMembershipEventId}/members/${accessUser.id}`
      );
      return accessUser;
    },
    onSuccess: (user) => {
      setMembershipError(null);
      setConfirmRemoval(false);
      setMembershipMessage(
        `${user.name} no longer administers ${selectedMembershipEvent?.name ?? 'this event'}.`
      );
      queryClient.invalidateQueries({
        queryKey: ['event-members', selectedMembershipEventId],
      });
    },
    onError: (error: unknown) => {
      setMembershipMessage(null);
      setMembershipError(getErrorMessage(error));
    },
  });
  const membershipMutationPending =
    grantEventAdministration.isPending || removeEventAdministration.isPending;
  membershipMutationPendingRef.current = membershipMutationPending;

  const closeAccessDialog = useCallback(() => {
    setAccessUser(null);
    setMembershipEventId(null);
    setMembershipMessage(null);
    setMembershipError(null);
    setConfirmRemoval(false);
  }, []);

  useEffect(() => {
    if (!accessUser) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!membershipMutationPendingRef.current) closeAccessDialog();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      accessTriggerRef.current?.focus();
    };
  }, [accessUser, closeAccessDialog]);

  const openAccessDialog = (user: User, trigger: HTMLButtonElement) => {
    accessTriggerRef.current = trigger;
    setMembershipEventId(null);
    setMembershipMessage(null);
    setMembershipError(null);
    setConfirmRemoval(false);
    setAccessUser(user);
  };

  const handleExport = async () => {
    setImportResult(null);
    try {
      await downloadAuthenticatedCsv('/users/export/csv', 'users-export.csv');
    } catch (error) {
      setImportResult((error as Error).message);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const csv = await file.text();
      const res = await api.post<APIResponse<{ imported: number; skipped: number; errors: string[] }>>('/users/bulk-import', { csv });
      const result = res.data.data;
      setImportResult(`Imported ${result?.imported ?? 0}, skipped ${result?.skipped ?? 0}${result?.errors.length ? `, ${result.errors.length} errors` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      setImportResult((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Import failed');
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading users..." />;
  if (isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Provision accounts and control who can administer each event.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
          >
            <Plus className="h-4 w-4" /> Add user
          </button>
        </div>
      </div>

      <label className="block max-w-md text-sm">
        <span className="sr-only">Search users</span>
        <input
          aria-label="Search users"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email"
          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </label>

      {importResult && (
        <div className="flex items-center justify-between rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          {importResult}
          <Tooltip content="Dismiss import summary">
            <button
              type="button"
              aria-label="Dismiss import summary"
              onClick={() => setImportResult(null)}
              className="rounded-md p-1 transition-colors hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-brand-900"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      )}
      {activationToken && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
          <strong>Copy this activation token now:</strong>
          <code className="ml-2 break-all">{activationToken}</code>
          <p className="mt-1">It is shown once. Deliver it to the intended person through an authenticated channel.</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">New user</h2>
            <Tooltip content="Close user form">
              <button
                type="button"
                aria-label="Close user form"
                onClick={() => setShowForm(false)}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              createUser.mutate(form);
            }}
            className="grid grid-cols-2 gap-3"
          >
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <option value="user">User</option>
              <option value="scanner">Scanner</option>
              <option value="admin">Global administrator</option>
            </select>
            {form.role === 'admin' && (
              <p className="col-span-2 text-sm text-brand-700 dark:text-brand-200">
                Global administrators can manage every event. For event-limited access, create a
                standard user, then use the shield action in the user directory.
              </p>
            )}
            <button type="submit" disabled={createUser.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {createUser.isPending ? 'Creating...' : 'Create user'}
            </button>
            {formError && <p className="col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
          </form>
        </div>
      )}

      {!users || users.length === 0 ? (
        <EmptyState title="No users yet" description="Add a user manually or import a CSV." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Account authority</th>
                  <th
                    aria-label={`Selected event authority ${selectedEvent?.name ?? 'No event selected'}`}
                    className="px-4 py-2"
                  >
                    <span className="block">Selected event authority</span>
                    <span
                      className="block max-w-48 truncate text-xs font-normal text-gray-400 dark:text-gray-500"
                      title={selectedEvent?.name ?? 'No event selected'}
                    >
                      {selectedEvent?.name ?? 'No event selected'}
                    </span>
                  </th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const authority = accountAuthority(u);
                  const selectedEventAuthority = eventAuthority(u, {
                    hasSelectedEvent: selectedEvent !== null,
                    isLoading: selectedEventMembershipsLoading,
                    isError: selectedEventMembershipsError,
                    isEventAdministrator: selectedEventAdministratorIds.has(u.id),
                  });
                  const statusClass = u.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
                  return (
                    <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-2">{u.name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${authority.className}`}>
                          {authority.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${selectedEventAuthority.className}`}
                        >
                          {selectedEventAuthority.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.is_active && u.role === 'user' && (
                            <Tooltip content="Manage event administrator access">
                              <button
                                type="button"
                                aria-label={`Manage ${u.name} event administrator access`}
                                onClick={(event) => openAccessDialog(u, event.currentTarget)}
                                className="rounded-md p-2 text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-brand-300 dark:hover:bg-brand-950/40 dark:hover:text-brand-200"
                              >
                                <ShieldPlus className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Tooltip>
                          )}
                          {u.is_active && (
                            <Tooltip content="Deactivate user">
                              <button
                                type="button"
                                aria-label={`Deactivate ${u.name}`}
                                onClick={() => deactivateUser.mutate(u.id)}
                                className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
            <span>
              Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1} · {pagination?.total ?? users.length} users
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                disabled={page >= (pagination?.totalPages ?? 1)}
                className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {accessUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !membershipMutationPending) {
              closeAccessDialog();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-access-dialog-title"
            aria-describedby="event-access-dialog-description"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-black/30 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-brand-100 p-2 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="event-access-dialog-title" className="truncate text-lg font-semibold">
                      Manage event access for {accessUser.name}
                    </h2>
                    <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                      {accessUser.email}
                    </p>
                  </div>
                </div>
                <p
                  id="event-access-dialog-description"
                  className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
                >
                  Grant or remove operational dashboard authority for one event. This does not
                  change the person’s account-level role.
                </p>
              </div>
              <Tooltip content="Close event access dialog">
                <button
                  ref={dialogCloseRef}
                  type="button"
                  aria-label="Close event access dialog"
                  onClick={closeAccessDialog}
                  disabled={membershipMutationPending}
                  className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>

            <div className="space-y-5 px-5 py-5">
              {eventsError ? (
                <div>
                  <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                    Events could not be loaded. Try again before changing access.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchEvents()}
                    className="mt-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-200"
                  >
                    Try again
                  </button>
                </div>
              ) : eventsLoading ? (
                <LoadingSpinner label="Loading events..." />
              ) : events.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Create an event before granting event administrator access.
                </p>
              ) : (
                <>
                  <label className="block text-sm font-medium">
                    Event
                    <select
                      aria-label="Event to administer"
                      value={selectedMembershipEventId ?? ''}
                      onChange={(event) => {
                        setMembershipEventId(Number(event.target.value));
                        setMembershipMessage(null);
                        setMembershipError(null);
                        setConfirmRemoval(false);
                      }}
                      disabled={membershipMutationPending}
                      className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
                    >
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {dialogMembershipsError ? (
                    <div>
                      <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                        Current event access could not be loaded. No change has been made.
                      </p>
                      <button
                        type="button"
                        onClick={() => refetchMemberships()}
                        className="mt-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-200"
                      >
                        Try again
                      </button>
                    </div>
                  ) : dialogMembershipsLoading ? (
                    <LoadingSpinner label="Checking event access..." />
                  ) : (
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/70">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Current authority for {selectedMembershipEvent?.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          selectedUserMembership
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {selectedUserMembership
                            ? 'Event administrator'
                            : 'No administrator access'}
                        </span>

                        {selectedUserMembership ? (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoval(true)}
                            disabled={membershipMutationPending}
                            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Remove event administrator access
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMembershipMessage(null);
                              setMembershipError(null);
                              grantEventAdministration.mutate();
                            }}
                            disabled={membershipMutationPending}
                            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-900"
                          >
                            {grantEventAdministration.isPending
                              ? 'Granting access...'
                              : 'Grant event administrator access'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {confirmRemoval && selectedUserMembership && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-100">
                      <p>
                        Remove {accessUser.name}’s operational dashboard access to{' '}
                        {selectedMembershipEvent?.name}?
                      </p>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmRemoval(false)}
                          disabled={membershipMutationPending}
                          className="rounded-md px-3 py-2 font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 dark:hover:bg-red-900/50"
                        >
                          Keep access
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEventAdministration.mutate()}
                          disabled={membershipMutationPending}
                          className="rounded-md bg-red-700 px-3 py-2 font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                        >
                          {removeEventAdministration.isPending
                            ? 'Removing...'
                            : 'Confirm removal'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {membershipMessage && (
                <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
                  {membershipMessage}
                </p>
              )}
              {membershipError && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                  {membershipError}
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <button
                type="button"
                onClick={closeAccessDialog}
                disabled={membershipMutationPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
