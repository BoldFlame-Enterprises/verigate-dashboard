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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/areas', label: 'Areas', icon: MapPin, roles: ['admin'] },
  { to: '/access', label: 'Access & Assignments', icon: ShieldCheck, roles: ['admin'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { to: '/sync-monitor', label: 'Sync Monitor', icon: Radio, roles: ['admin'] },
  { to: '/incidents', label: 'Incidents & Overrides', icon: AlertTriangle, roles: ['admin'] },
  { to: '/events', label: 'Events', icon: CalendarDays, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { events, selectedEvent, selectEvent } = useEvent();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <ShieldCheck className="h-6 w-6 text-brand-600" />
          <span className="text-lg font-semibold">VeriGate</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems
            .filter((item) => !user || item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400'
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {user?.name} <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">{user?.role}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
