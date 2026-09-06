import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: readonly UserRole[];
  redirectTo?: string;
}

/**
 * Route guard component that restricts access based on user role
 * Redirects to 403 page or specified path if user doesn't have required role
 */
export function RequireRole({ children, allowedRoles, redirectTo = '/403' }: RequireRoleProps) {
  const { user, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  const hasRequiredRole = allowedRoles.includes(user.role);
  
  if (!hasRequiredRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Component to show 403 Forbidden page
 */
export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <div className="text-center animate-fade-in">
        <h1 className="text-6xl font-bold text-danger mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-dark-text mb-4">Access Denied</h2>
        <p className="text-dark-muted mb-8">
          You don't have permission to access this resource.
        </p>
        <a href="/dashboard" className="btn-primary">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
