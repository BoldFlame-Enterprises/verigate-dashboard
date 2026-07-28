import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import AreasPage from './pages/AreasPage';
import AccessPage from './pages/AccessPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SyncMonitorPage from './pages/SyncMonitorPage';
import IncidentsPage from './pages/IncidentsPage';
import EventsPage from './pages/EventsPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import { useAuth } from './context/AuthContext';
import { useEvent } from './context/EventContext';

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
  );
}
