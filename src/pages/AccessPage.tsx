import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useEvent } from '../context/EventContext';
import { AccessLevel, AccessAssignment, Area, User } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

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

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<APIResponse<User[]>>('/users');
      return res.data.data ?? [];
    },
  });

  const { data: assignments, isLoading: assignmentsLoading, isError } = useQuery({
    queryKey: ['assignments', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<AccessAssignment[]>>('/access/assignments/list', { params: { event_id: eventId } });
      return res.data.data ?? [];
    },
    enabled: !!eventId,
  });

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
              <button onClick={() => setShowLevelForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createLevel.mutate(); }} className="grid grid-cols-3 gap-3">
              <input required placeholder="Name (e.g. VIP)" value={levelName} onChange={(e) => setLevelName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <input required type="number" placeholder="Priority" value={levelPriority} onChange={(e) => setLevelPriority(Number(e.target.value))} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
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
              <button onClick={() => setShowAssignForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); setAssignError(null); createAssignment.mutate(); }}
              className="grid grid-cols-4 gap-3"
            >
              <select required value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                <option value="">User</option>
                {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select required value={assignLevelId} onChange={(e) => setAssignLevelId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                <option value="">Access level</option>
                {levels?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <select required value={assignAreaId} onChange={(e) => setAssignAreaId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                <option value="">Area</option>
                {areas?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button type="submit" disabled={createAssignment.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {createAssignment.isPending ? 'Assigning...' : 'Assign'}
              </button>
              {assignError && <p className="col-span-4 text-sm text-red-600 dark:text-red-400">{assignError}</p>}
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
                      <button onClick={() => revokeAssignment.mutate(a.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
