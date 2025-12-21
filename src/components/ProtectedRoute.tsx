import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePlan?: boolean;
}

export function ProtectedRoute({ children, requirePlan = true }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has any active plan
  const hasActivePlan = user.statusDisparador || user.statusExtrator;
  
  // If plan is required and user doesn't have one, redirect to contratar page
  // But don't redirect if already on contratar page to avoid infinite loop
  if (requirePlan && !hasActivePlan && location.pathname !== '/contratar') {
    return <Navigate to="/contratar" replace />;
  }

  return <>{children}</>;
}
