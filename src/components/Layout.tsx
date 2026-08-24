import { useEffect, useMemo, useRef, useState } from 'react';
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
  Menu,
  X,
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavigationLinkRef = useRef<HTMLAnchorElement>(null);
  const visibleNavItems = useMemo(() => navItems.filter((item) =>
    user?.role === 'admin' || (!!item.capability && hasCapability(item.capability))
  ), [hasCapability, user?.role]);
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

  useEffect(() => {
    if (!navigationOpen) return undefined;
    firstNavigationLinkRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setNavigationOpen(false);
      navigationButtonRef.current?.focus();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [navigationOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-md bg-white px-4 py-2 font-medium text-brand-800 shadow-lg focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:bg-gray-900 dark:text-brand-200"
      >
        Skip to main content
      </a>
      {navigationOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-gray-950/60 lg:hidden"
          onClick={() => {
            setNavigationOpen(false);
            navigationButtonRef.current?.focus();
          }}
        />
      )}
      <aside
        id="dashboard-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 lg:static lg:w-64 lg:translate-x-0 ${
          navigationOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <ShieldCheck aria-hidden="true" className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          <span className="text-lg font-semibold tracking-tight">VeriGate</span>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
            onClick={() => {
              setNavigationOpen(false);
              navigationButtonRef.current?.focus();
            }}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item, index) => (
              <NavLink
                ref={index === 0 ? firstNavigationLinkRef : undefined}
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setNavigationOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`
                }
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <button
            ref={navigationButtonRef}
            type="button"
            aria-controls="dashboard-navigation"
            aria-expanded={navigationOpen}
            aria-label="Open navigation"
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:text-gray-200 dark:hover:bg-gray-800 lg:hidden"
            onClick={() => setNavigationOpen(true)}
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label htmlFor="event-select" className="text-sm text-gray-500 dark:text-gray-400">
              Event
            </label>
            <select
              id="event-select"
              value={selectedEvent?.id ?? ''}
              onChange={(e) => selectEvent(Number(e.target.value))}
              className="min-h-11 min-w-0 max-w-full flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 sm:max-w-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="hidden max-w-40 truncate sm:inline">{user?.name}</span>
            <span
              aria-label={`Account authority: ${authorityLabel}`}
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${authorityClass}`}
            >
              {authorityLabel}
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-3 focus:outline-none sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
