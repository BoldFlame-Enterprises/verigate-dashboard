import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useEvent } from '../context/EventContext';
import { AccessLevel, AccessAssignment, Area, CursorPage, User } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';

export default function AccessPage() {
  const { selectedEvent } = useEvent();
  const queryClient = useQueryClient();

  const [showLevelForm, setShowLevelForm] = useState(false);
  const [levelName, setLevelName] = useState('');
  const [levelPriority, setLevelPriority] = useState(1);

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignLevelId, setAssignLevelId] = useState('');
  const [assignAreaId, setAssignAreaId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [userCursors, setUserCursors] = useState<string[]>([]);
  const [assignmentCursors, setAssignmentCursors] = useState<string[]>([]);

  const eventId = selectedEvent?.id;

  const { data: levels, isLoading: levelsLoading } = useQuery({
    queryKey: ['access-levels', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<AccessLevel[]>>('/access', { params: { event_id: eventId } });
      return res.data.data ?? [];
    },
    enabled: !!eventId,
  });

  const { data: areas } = useQuery({
    queryKey: ['areas', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<Area[]>>('/areas', { params: { event_id: eventId } });
      return res.data.data ?? [];
    },
    enabled: !!eventId,
  });

  useEffect(() => {
    if (userSearch.trim() === debouncedUserSearch) return undefined;
    const timer = window.setTimeout(() => {
      setDebouncedUserSearch(userSearch.trim());
      setUserCursors([]);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [userSearch, debouncedUserSearch]);

  useEffect(() => setAssignmentCursors([]), [eventId]);

  const currentUserCursor = userCursors[userCursors.length - 1];
  const { data: userDirectory } = useQuery({
    queryKey: ['users', { cursor: currentUserCursor, search: debouncedUserSearch }],
    queryFn: async ({ signal }) => {
      const res = await api.get<APIResponse<CursorPage<User>>>('/users', {
        params: {
          cursor: currentUserCursor,
          limit: 25,
          search: debouncedUserSearch || undefined,
          is_active: true,
        },
        signal,
      });
      return res.data.data ?? { items: [], has_more: false, next_cursor: null };
    },
    enabled: showAssignForm,
  });
  const users = userDirectory?.items ?? [];

  const currentAssignmentCursor = assignmentCursors[assignmentCursors.length - 1];
  const { data: assignmentPage, isLoading: assignmentsLoading, isError } = useQuery({
    queryKey: ['assignments', eventId, currentAssignmentCursor],
    queryFn: async ({ signal }) => {
      const res = await api.get<APIResponse<CursorPage<AccessAssignment>>>('/access/assignments/list', {
        params: { event_id: eventId, limit: 50, cursor: currentAssignmentCursor },
        signal,
      });
      return res.data.data ?? { items: [], has_more: false, next_cursor: null };
    },
    enabled: !!eventId,
  });
  const assignments = assignmentPage?.items ?? [];

  const createLevel = useMutation({
    mutationFn: async () => {
      const res = await api.post<APIResponse<AccessLevel>>('/access', { event_id: eventId, name: levelName, priority: levelPriority });
      if (!res.data.success) throw new Error(res.data.error);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-levels', eventId] });
      setShowLevelForm(false);
      setLevelName('');
      setLevelPriority(1);
    },
  });

  const createAssignment = useMutation({
    mutationFn: async () => {
      const res = await api.post<APIResponse<AccessAssignment>>('/access/assignments', {
        event_id: eventId,
        user_id: Number(assignUserId),
        access_level_id: Number(assignLevelId),
        area_id: Number(assignAreaId),
      });
      if (!res.data.success) throw new Error(res.data.error);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', eventId] });
      setShowAssignForm(false);
      setAssignUserId('');
      setAssignLevelId('');
      setAssignAreaId('');
      setAssignmentCursors([]);
    },
    onError: (err: unknown) => setAssignError(getErrorMessage(err)),
  });

  const revokeAssignment = useMutation({
    mutationFn: async (id: number) => api.delete(`/access/assignments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments', eventId] }),
  });

  if (!selectedEvent) return <EmptyState title="No event selected" />;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Access levels</h1>
          <button onClick={() => setShowLevelForm(true)} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add access level
          </button>
        </div>

        {showLevelForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">New access level</h2>
              <Tooltip content="Close access-level form">
                <button
                  type="button"
                  aria-label="Close access-level form"
                  onClick={() => setShowLevelForm(false)}
                  className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createLevel.mutate(); }} className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="access-level-name" className="grid gap-1 text-sm font-medium">Name
                <input id="access-level-name" required placeholder="For example, VIP" value={levelName} onChange={(e) => setLevelName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
              </label>
              <label htmlFor="access-level-priority" className="grid gap-1 text-sm font-medium">Priority
                <input id="access-level-priority" required type="number" value={levelPriority} onChange={(e) => setLevelPriority(Number(e.target.value))} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
              </label>
              <button type="submit" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Create</button>
            </form>
          </div>
        )}

        {levelsLoading ? (
          <LoadingSpinner />
        ) : !levels || levels.length === 0 ? (
          <EmptyState title="No access levels yet" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <span key={level.id} className="rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700">
                {level.name} <span className="text-gray-400">· priority {level.priority}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Access assignments</h1>
          <button onClick={() => setShowAssignForm(true)} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Assign access
          </button>
        </div>

        {showAssignForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Assign a user to an area</h2>
              <Tooltip content="Close assignment form">
                <button
                  type="button"
                  aria-label="Close assignment form"
                  onClick={() => setShowAssignForm(false)}
                  className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); setAssignError(null); createAssignment.mutate(); }}
              className="space-y-3"
            >
              <label htmlFor="assignment-user-search" className="grid gap-1 text-sm font-medium">Search users
              <input
                id="assignment-user-search"
                value={userSearch}
                onChange={(event) => {
                  setUserSearch(event.target.value);
                  setUserCursors([]);
                  setAssignUserId('');
                }}
                placeholder="Search users by name or email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label htmlFor="assignment-user" className="grid gap-1 text-sm font-medium">User
                <select id="assignment-user" required value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                  <option value="">User</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
                </select>
                </label>
                <label htmlFor="assignment-level" className="grid gap-1 text-sm font-medium">Access level
                <select id="assignment-level" required value={assignLevelId} onChange={(e) => setAssignLevelId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                  <option value="">Access level</option>
                  {levels?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                </label>
                <label htmlFor="assignment-area" className="grid gap-1 text-sm font-medium">Area
                <select id="assignment-area" required value={assignAreaId} onChange={(e) => setAssignAreaId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                  <option value="">Area</option>
                  {areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                </label>
                <button type="submit" disabled={createAssignment.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                  {createAssignment.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  User page {userCursors.length + 1} · {users.length} matches shown
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setUserCursors((value) => value.slice(0, -1)); setAssignUserId(''); }}
                    disabled={userCursors.length === 0}
                    className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-700"
                  >
                    Previous users
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (userDirectory?.next_cursor) {
                        setUserCursors((value) => [...value, userDirectory.next_cursor!]);
                        setAssignUserId('');
                      }
                    }}
                    disabled={!userDirectory?.has_more || !userDirectory.next_cursor}
                    className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-700"
                  >
                    Next users
                  </button>
                </div>
              </div>
              {assignError && <p className="text-sm text-red-600 dark:text-red-400">{assignError}</p>}
            </form>
          </div>
        )}

        {assignmentsLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <ErrorState />
        ) : !assignments || assignments.length === 0 ? (
          <EmptyState title="No assignments yet" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Access level</th>
                  <th className="px-4 py-2">Area</th>
                  <th className="px-4 py-2">Valid until</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2">{a.user_name}</td>
                    <td className="px-4 py-2">{a.access_level_name}</td>
                    <td className="px-4 py-2">{a.area_name}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{new Date(a.valid_until).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">
                      <Tooltip content="Revoke assignment">
                        <button
                          type="button"
                          aria-label={`Revoke ${a.user_name}'s assignment`}
                          onClick={() => revokeAssignment.mutate(a.id)}
                          className="rounded-md p-2 text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(assignmentCursors.length > 0 || assignmentPage?.has_more) && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignmentCursors((value) => value.slice(0, -1))}
              disabled={assignmentCursors.length === 0}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40 dark:border-gray-700"
            >Previous assignments</button>
            <button
              type="button"
              onClick={() => assignmentPage?.next_cursor &&
                setAssignmentCursors((value) => [...value, assignmentPage.next_cursor!])}
              disabled={!assignmentPage?.has_more || !assignmentPage.next_cursor}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40 dark:border-gray-700"
            >Next assignments</button>
          </div>
        )}
      </section>
    </div>
  );
}
