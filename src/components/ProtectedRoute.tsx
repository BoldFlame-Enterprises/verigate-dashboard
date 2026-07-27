import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { EventCapability, UserRole } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredCapabilities?: EventCapability[];
  capabilityScope?: 'selected' | 'any';
}

export default function ProtectedRoute({
  allowedRoles,
  requiredCapabilities,
  capabilityScope = 'selected',
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const eventContext = useEvent();

  if (isLoading || eventContext.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleAllowed = allowedRoles?.includes(user.role) ?? false;
  const capabilityAllowed = requiredCapabilities
    ? capabilityScope === 'any'
      ? eventContext.hasAnyEventCapability(requiredCapabilities)
      : requiredCapabilities.some(eventContext.hasCapability)
    : false;
  const hasAccess = !allowedRoles && !requiredCapabilities
    ? true
    : roleAllowed || capabilityAllowed;

  if (!hasAccess) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold">This operation is not available for your event access</p>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Select an event where you are an administrator, or ask a global administrator to update your membership.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
