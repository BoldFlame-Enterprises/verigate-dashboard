import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { useEvent } from '../context/EventContext';
import { Incident, EmergencyOverride } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

export default function IncidentsPage() {
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();

  const { data: incidents, isLoading: incidentsLoading, isError: incidentsError } = useQuery({
    queryKey: ['incidents', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<Incident[]>>('/incidents', { params: { event_id: eventId } });
      return res.data.data ?? [];
    },
    enabled: !!eventId,
    refetchInterval: 10_000,
  });

  const { data: overrides, isLoading: overridesLoading, isError: overridesError } = useQuery({
    queryKey: ['overrides', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<EmergencyOverride[]>>('/incidents/overrides', { params: { event_id: eventId } });
      return res.data.data ?? [];
    },
    enabled: !!eventId,
    refetchInterval: 10_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => api.put(`/incidents/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents', eventId] }),
  });

  const reviewOverride = useMutation({
    mutationFn: async (id: number) => api.put(`/incidents/overrides/${id}/review`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['overrides', eventId] }),
  });

  if (!selectedEvent) return <EmptyState title="No event selected" />;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Incident reports</h1>
        {incidentsLoading ? (
          <LoadingSpinner />
        ) : incidentsError ? (
          <ErrorState />
        ) : !incidents || incidents.length === 0 ? (
          <EmptyState title="No incidents reported" description="Suspicious activity or technical issues reported from the scanner app will appear here." />
        ) : (
          <div className="space-y-2">
            {incidents.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div>
                  <p className="font-medium">{i.category} {i.area_name ? `· ${i.area_name}` : ''}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{i.description}</p>
                  <p className="text-xs text-gray-400">
                    Reported by {i.reporter_name ?? 'unknown'} &middot; {new Date(i.created_at).toLocaleString()}
                  </p>
                </div>
                <select
                  value={i.status}
                  onChange={(e) => updateStatus.mutate({ id: i.id, status: e.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Emergency overrides</h1>
        {overridesLoading ? (
          <LoadingSpinner />
        ) : overridesError ? (
          <ErrorState />
        ) : !overrides || overrides.length === 0 ? (
          <EmptyState title="No manual overrides" description="Overrides used when a scanner grants/denies access outside the normal QR flow will appear here." />
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  {o.access_granted ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="font-medium">
                      {o.user_name ?? 'Unknown user'} at {o.area_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Reason: {o.reason}</p>
                    <p className="text-xs text-gray-400">
                      By {o.scanner_name ?? 'unknown scanner'} &middot; {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {o.reviewed_at ? (
                  <span className="text-xs text-gray-400">Reviewed</span>
                ) : (
                  <button
                    onClick={() => reviewOverride.mutate(o.id)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Mark reviewed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
