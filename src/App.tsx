import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/access" element={<AccessPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/sync-monitor" element={<SyncMonitorPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/events" element={<EventsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
