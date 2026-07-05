import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold">This dashboard is for event admins only</p>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Your account role is "{user.role}". Scanners and attendees use the VeriGate mobile apps instead.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
