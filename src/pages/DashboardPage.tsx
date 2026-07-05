import { useQuery } from '@tanstack/react-query';
import { Users, MapPin, ShieldCheck, ScanLine, CheckCircle2, XCircle } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { useEvent } from '../context/EventContext';
import { DashboardData } from '../types';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

export default function DashboardPage() {
  const { selectedEvent } = useEvent();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', selectedEvent?.id],
    queryFn: async () => {
      const res = await api.get<APIResponse<DashboardData>>('/admin/dashboard', {
        params: { event_id: selectedEvent!.id },
      });
      return res.data.data!;
    },
    enabled: !!selectedEvent,
    refetchInterval: 15_000,
  });

  if (!selectedEvent) {
    return <EmptyState title="No event selected" description="Create an event to get started." />;
  }
  if (isLoading) return <LoadingSpinner label="Loading dashboard..." />;
  if (isError || !data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{selectedEvent.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Live overview, refreshes every 15s</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Event members" value={data.members} icon={Users} />
        <StatCard label="Areas" value={data.areas} icon={MapPin} />
        <StatCard label="Access levels" value={data.access_levels} icon={ShieldCheck} />
        <StatCard label="Scans (24h)" value={data.scans.last_24h} icon={ScanLine} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total scans" value={data.scans.total} icon={ScanLine} />
        <StatCard label="Granted" value={data.scans.granted} icon={CheckCircle2} tone="success" />
        <StatCard label="Denied" value={data.scans.denied} icon={XCircle} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold">Scans by area</h2>
          {data.scans_by_area.length === 0 ? (
            <EmptyState title="No scans yet" />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="pb-2">Area</th>
                  <th className="pb-2">Granted</th>
                  <th className="pb-2">Denied</th>
                </tr>
              </thead>
              <tbody>
                {data.scans_by_area.map((row) => (
                  <tr key={row.area_id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2">{row.area_name}</td>
                    <td className="py-2 text-emerald-600 dark:text-emerald-400">{row.granted}</td>
                    <td className="py-2 text-red-600 dark:text-red-400">{row.denied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold">Recent scans</h2>
          {data.recent_scans.length === 0 ? (
            <EmptyState title="No scans yet" />
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {data.recent_scans.map((scan) => (
                <li key={scan.id} className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <div>
                    <p className="font-medium">{scan.user_name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {scan.area_name} &middot; {new Date(scan.scanned_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {scan.access_granted ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
