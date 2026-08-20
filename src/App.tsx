import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './context/AuthContext';
import { useEvent } from './context/EventContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AreasPage = lazy(() => import('./pages/AreasPage'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SyncMonitorPage = lazy(() => import('./pages/SyncMonitorPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function DashboardLanding() {
  const { user } = useAuth();
  const { hasCapability } = useEvent();
  if (user?.role === 'admin') return <DashboardPage />;
  if (hasCapability('manage_event_devices')) return <Navigate to="/sync-monitor" replace />;
  if (hasCapability('manage_operational_cases')) return <Navigate to="/incidents" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading page..." />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate" element={<ActivateAccountPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={(
          <ProtectedRoute
            allowedRoles={['admin']}
            requiredCapabilities={['manage_event_devices', 'manage_operational_cases']}
            capabilityScope="any"
          />
        )}
      >
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardLanding />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/areas" element={<AreasPage />} />
            <Route path="/access" element={<AccessPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route
            element={(
              <ProtectedRoute
                allowedRoles={['admin']}
                requiredCapabilities={['manage_event_devices']}
              />
            )}
          >
            <Route path="/sync-monitor" element={<SyncMonitorPage />} />
          </Route>

          <Route
            element={(
              <ProtectedRoute
                allowedRoles={['admin']}
                requiredCapabilities={['manage_operational_cases']}
              />
            )}
          >
            <Route path="/incidents" element={<IncidentsPage />} />
          </Route>
        </Route>
      </Route>
      </Routes>
    </Suspense>
  );
}
