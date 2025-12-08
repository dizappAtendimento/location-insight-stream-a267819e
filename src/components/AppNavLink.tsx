import { Link, useLocation } from 'react-router-dom';
import { MapPin, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
  MapPin,
  Instagram,
};

interface AppNavLinkProps {
  to: string;
  icon: keyof typeof icons;
  children: React.ReactNode;
}

export function AppNavLink({ to, icon, children }: AppNavLinkProps) {
  const location = useLocation();
  const Icon = icons[icon];
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
