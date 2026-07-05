import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useEvent } from '../context/EventContext';
import { Area } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

export default function AreasPage() {
  const { selectedEvent } = useEvent();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requiresScan, setRequiresScan] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: areas, isLoading, isError } = useQuery({
    queryKey: ['areas', selectedEvent?.id],
    queryFn: async () => {
      const res = await api.get<APIResponse<Area[]>>('/areas', { params: { event_id: selectedEvent!.id } });
      return res.data.data ?? [];
    },
    enabled: !!selectedEvent,
  });

  const createArea = useMutation({
    mutationFn: async () => {
      const res = await api.post<APIResponse<Area>>('/areas', {
        event_id: selectedEvent!.id,
        name,
        description,
        requires_scan: requiresScan,
      });
      if (!res.data.success) throw new Error(res.data.error);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', selectedEvent?.id] });
      setShowForm(false);
      setName('');
      setDescription('');
      setRequiresScan(true);
    },
    onError: (err: unknown) => setFormError(getErrorMessage(err)),
  });

  const deactivateArea = useMutation({
    mutationFn: async (id: number) => api.delete(`/areas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas', selectedEvent?.id] }),
  });

  if (!selectedEvent) return <EmptyState title="No event selected" />;
  if (isLoading) return <LoadingSpinner label="Loading areas..." />;
  if (isError) return <ErrorState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Areas</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add area
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">New area</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              createArea.mutate();
            }}
            className="grid grid-cols-2 gap-3"
          >
            <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={requiresScan} onChange={(e) => setRequiresScan(e.target.checked)} />
              Requires scan
            </label>
            <button type="submit" disabled={createArea.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {createArea.isPending ? 'Creating...' : 'Create area'}
            </button>
            {formError && <p className="col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
          </form>
        </div>
      )}

      {!areas || areas.length === 0 ? (
        <EmptyState title="No areas yet" description="Add areas for this event, e.g. Main Arena or VIP Lounge." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Requires scan</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{a.description}</td>
                  <td className="px-4 py-2">{a.requires_scan ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${a.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {a.is_active && (
                      <button onClick={() => deactivateArea.mutate(a.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
