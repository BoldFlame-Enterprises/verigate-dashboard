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
const LIVE_REFRESH_INTERVAL = 10_000;
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(17, 24, 39, 0.98)',
  border: '1px solid #374151',
  borderRadius: '0.75rem',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
};

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
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });

  const { data: breakdown, isLoading: breakdownLoading, isError } = useQuery({
    queryKey: ['analytics-breakdown', eventId],
    queryFn: async () => {
      const res = await api.get<APIResponse<Breakdown>>('/analytics/breakdown', { params: { event_id: eventId } });
      return res.data.data!;
    },
    enabled: !!eventId,
    refetchInterval: LIVE_REFRESH_INTERVAL,
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
    Granted: Number(row.granted),
    Denied: Number(row.denied),
  }));

  const accessLevelPie = breakdown.by_access_level.map((l) => ({ name: l.name, value: l.assigned_users }));
  const maxHourlyScans = Math.max(1, ...hourlyData.map((row) => row.Granted + row.Denied));

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
        <div className="mb-4">
          <h2 className="font-semibold">Scan volume (last 48h)</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Hourly granted and denied scans · refreshes every 10s</p>
        </div>
        {hourlyData.length === 0 ? (
          <EmptyState title="No scans in the last 48 hours" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="35%">
              <defs>
                <linearGradient id="grantedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="deniedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 6" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#475569', strokeOpacity: 0.45 }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, maxHourlyScans]}
                tickCount={Math.min(maxHourlyScans + 1, 6)}
              />
              <Tooltip
                cursor={{ fill: '#64748b', fillOpacity: 0.12 }}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="Granted" stackId="a" fill="url(#grantedGradient)" maxBarSize={56} radius={[5, 5, 0, 0]} />
              <Bar dataKey="Denied" stackId="a" fill="url(#deniedGradient)" maxBarSize={56} radius={[5, 5, 0, 0]} />
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
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 600 }} />
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
