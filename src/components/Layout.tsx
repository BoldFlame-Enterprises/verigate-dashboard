import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ShieldCheck,
  BarChart3,
  Radio,
  AlertTriangle,
  CalendarDays,
  LogOut,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { EventCapability } from '../types';

const navItems: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  globalOnly?: boolean;
  capability?: EventCapability;
}> = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, globalOnly: true },
  { to: '/users', label: 'Users', icon: Users, globalOnly: true },
  { to: '/areas', label: 'Areas', icon: MapPin, globalOnly: true },
  { to: '/access', label: 'Access & Assignments', icon: ShieldCheck, globalOnly: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, globalOnly: true },
  { to: '/sync-monitor', label: 'Sync Monitor', icon: Radio, capability: 'manage_event_devices' },
  { to: '/incidents', label: 'Incidents & Overrides', icon: AlertTriangle, capability: 'manage_operational_cases' },
  { to: '/events', label: 'Events', icon: CalendarDays, globalOnly: true },
  { to: '/settings', label: 'Global Settings', icon: Settings, globalOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { events, selectedEvent, selectEvent, hasCapability } = useEvent();
  const authorityLabel = user?.role === 'admin'
    ? 'Global administrator'
    : selectedEvent?.administration_scope === 'event'
      ? 'Event administrator'
      : user?.role;
  const authorityClass = user?.role === 'admin'
    ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200'
    : selectedEvent?.administration_scope === 'event'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <ShieldCheck className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          <span className="text-lg font-semibold tracking-tight">VeriGate</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems
            .filter((item) =>
              user?.role === 'admin' ||
              (!!item.capability && hasCapability(item.capability))
            )
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <label htmlFor="event-select" className="text-sm text-gray-500 dark:text-gray-400">
              Event
            </label>
            <select
              id="event-select"
              value={selectedEvent?.id ?? ''}
              onChange={(e) => selectEvent(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="truncate">{user?.name}</span>
            <span
              aria-label={`Account authority: ${authorityLabel}`}
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${authorityClass}`}
            >
              {authorityLabel}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
