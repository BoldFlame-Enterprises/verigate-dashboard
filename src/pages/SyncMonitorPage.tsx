import { useQuery } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { useEvent } from '../context/EventContext';
import { DeviceSyncStatus } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

const statusColor: Record<string, string> = {
  online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  stale: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  offline: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  unknown: 'bg-gray-100 text-gray-500 dark:bg-gray-800',
};

export default function SyncMonitorPage() {
  const { selectedEvent } = useEvent();

  const { data: devices, isLoading, isError } = useQuery({
    queryKey: ['device-status', selectedEvent?.id],
    queryFn: async () => {
      const res = await api.get<APIResponse<DeviceSyncStatus[]>>('/notifications/device-status', {
        params: { event_id: selectedEvent!.id },
      });
      return res.data.data ?? [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 10_000,
  });

  if (!selectedEvent) return <EmptyState title="No event selected" />;
  if (isLoading) return <LoadingSpinner label="Loading device status..." />;
  if (isError) return <ErrorState />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Real-time sync monitor</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Refreshes every 10s. Devices are "online" if they synced in the last 2 minutes.</p>
      </div>

      {!devices || devices.length === 0 ? (
        <EmptyState
          title="No devices have synced yet"
          description="Once the pass or scan apps call the sync-heartbeat endpoint, they'll show up here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <div key={d.device_id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-gray-400" />
                  <span className="font-medium capitalize">{d.app} app</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor[d.status]}`}>{d.status}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{d.user_name ?? 'Unassigned device'}</p>
              <p className="mt-2 text-xs text-gray-400">Device: {d.device_id}</p>
              <p className="text-xs text-gray-400">
                Last sync: {d.last_sync_at ? new Date(d.last_sync_at).toLocaleString() : 'never'}
              </p>
              {d.last_scan_upload_at && (
                <p className="text-xs text-gray-400">Last scan upload: {new Date(d.last_scan_upload_at).toLocaleString()}</p>
              )}
              {d.local_db_version && <p className="text-xs text-gray-400">Local DB version: {d.local_db_version}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
