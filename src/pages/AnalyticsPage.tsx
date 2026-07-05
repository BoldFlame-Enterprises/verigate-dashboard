import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api, API_BASE_URL, tokenStorage, APIResponse } from '../lib/api';
import { useEvent } from '../context/EventContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

interface ScanVolume {
  hourly: { bucket: string; granted: number; denied: number }[];
  peak_hours: { hour_of_day: number; count: number }[];
}

interface Breakdown {
  overall: { total: number; granted: number; denied: number; grant_rate: number };
  by_area: { id: number; name: string; total: number; granted: number; denied: number }[];
  by_access_level: { id: number; name: string; assigned_users: number }[];
  by_scanner: { id: number; name: string; scans: number; granted: number; denied: number; last_scan_at: string }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];

export default function AnalyticsPage() {
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.id;

  const { data: volume, isLoading: volumeLoading } = useQuery({
    queryKey: ['analytics-volume', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<ScanVolume>>('/analytics/scan-volume', { params: { event_id: eventId } });
      return res.data.data!;
    },
    enabled: !!eventId,
  });

  const { data: breakdown, isLoading: breakdownLoading, isError } = useQuery({
    queryKey: ['analytics-breakdown', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<Breakdown>>('/analytics/breakdown', { params: { event_id: eventId } });
      return res.data.data!;
    },
    enabled: !!eventId,
  });

  const handleExport = () => {
    const token = tokenStorage.getAccessToken();
    fetch(`${API_BASE_URL}/analytics/export/scans.csv?event_id=${eventId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scans-event-${eventId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  if (!selectedEvent) return <EmptyState title="No event selected" />;
  if (volumeLoading || breakdownLoading) return <LoadingSpinner label="Loading analytics..." />;
  if (isError || !breakdown || !volume) return <ErrorState />;

  const hourlyData = volume.hourly.map((row) => ({
    time: new Date(row.bucket).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric' }),
    Granted: row.granted,
    Denied: row.denied,
  }));

  const accessLevelPie = breakdown.by_access_level.map((l) => ({ name: l.name, value: l.assigned_users }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          <Download className="h-4 w-4" /> Export scans CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total scans</p>
          <p className="text-2xl font-semibold">{breakdown.overall.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Grant rate</p>
          <p className="text-2xl font-semibold">{(breakdown.overall.grant_rate * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Granted</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{breakdown.overall.granted}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Denied</p>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{breakdown.overall.denied}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-semibold">Scan volume (last 48h)</h2>
        {hourlyData.length === 0 ? (
          <EmptyState title="No scans in the last 48 hours" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Granted" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Denied" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold">Assignments by access level</h2>
          {accessLevelPie.length === 0 ? (
            <EmptyState title="No assignments yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={accessLevelPie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {accessLevelPie.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold">Scanner / device activity</h2>
          {breakdown.by_scanner.length === 0 ? (
            <EmptyState title="No scanner activity yet" />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="pb-2">Scanner</th>
                  <th className="pb-2">Scans</th>
                  <th className="pb-2">Grant rate</th>
                  <th className="pb-2">Last scan</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.by_scanner.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2">{s.scans}</td>
                    <td className="py-2">{s.scans > 0 ? `${((s.granted / s.scans) * 100).toFixed(0)}%` : '-'}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{new Date(s.last_scan_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
