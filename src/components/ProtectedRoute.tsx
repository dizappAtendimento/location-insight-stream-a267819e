import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePlan?: boolean;
}

// Função para verificar se o plano está expirado
const isPlanExpired = (dataValidade: string | null): boolean => {
  if (!dataValidade) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expirationDate = new Date(dataValidade);
  expirationDate.setHours(0, 0, 0, 0);
  return today > expirationDate;
};

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
    return <Navigate to="/login" replace />;
  }

  // Verificar se o usuário tem plano ativo E não expirado
  const hasActiveDisparador = user.statusDisparador && !isPlanExpired(user.dataValidade);
  const hasActiveExtrator = user.statusExtrator && !isPlanExpired(user.dataValidadeExtrator);
  const hasActivePlan = hasActiveDisparador || hasActiveExtrator;
  
  // Se plano é requerido e usuário não tem um ativo ou expirou, redirecionar para contratar
  // Mas não redirecionar se já estiver na página de contratar
  if (requirePlan && !hasActivePlan && location.pathname !== '/contratar') {
    return <Navigate to="/contratar" replace />;
  }

  return <>{children}</>;
}
