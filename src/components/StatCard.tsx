import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
  delay?: number;
  accentColor?: 'primary' | 'success' | 'warning' | 'info' | 'highlight';
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
  className,
  delay = 0,
  accentColor = 'primary',
}: StatCardProps) {
  const accentStyles = {
    primary: {
      border: 'border-l-highlight/60',
      value: 'text-foreground',
      icon: 'text-highlight bg-highlight/10',
      iconBorder: 'border-highlight/20',
    },
    success: {
      border: 'border-l-highlight/60',
      value: 'text-highlight',
      icon: 'text-highlight bg-highlight/10',
      iconBorder: 'border-highlight/20',
    },
    warning: {
      border: 'border-l-amber-500/60',
      value: 'text-amber-500',
      icon: 'text-amber-500 bg-amber-500/10',
      iconBorder: 'border-amber-500/20',
    },
    info: {
      border: 'border-l-highlight/40',
      value: 'text-muted-foreground',
      icon: 'text-highlight/70 bg-highlight/10',
      iconBorder: 'border-highlight/20',
    },
    highlight: {
      border: 'border-l-highlight/60',
      value: 'text-highlight',
      icon: 'text-highlight bg-highlight/10',
      iconBorder: 'border-highlight/20',
    },
  };

  const styles = accentStyles[accentColor];

  return (
    <div 
      className={cn(
        "stat-card group p-4 lg:p-5 opacity-0 animate-fade-in-up hover-lift border-l-2",
        styles.border,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            {title}
          </p>
          <p className={cn(
            "text-xl sm:text-2xl lg:text-[1.75rem] font-bold tracking-tight leading-none transition-colors duration-200",
            styles.value
          )}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {trend && (
            <p className={cn(
              "text-[10px] font-medium flex items-center gap-1",
              trendPositive ? "text-emerald-500" : "text-muted-foreground"
            )}>
              <span className={cn(
                "w-1 h-1 rounded-full flex-shrink-0",
                trendPositive ? "bg-emerald-500 animate-pulse-soft" : "bg-muted-foreground/50"
              )} />
              <span className="truncate">{trend}</span>
            </p>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-lg border transition-all duration-300 group-hover:scale-105 flex-shrink-0",
          styles.icon,
          styles.iconBorder
        )}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}