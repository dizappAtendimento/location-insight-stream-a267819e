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
  accentColor?: 'primary' | 'success' | 'warning' | 'info';
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
      gradient: 'from-primary/80 via-primary/50 to-transparent',
      value: 'text-primary',
      icon: 'text-primary/70',
      glow: 'hover:shadow-primary/10',
    },
    success: {
      gradient: 'from-emerald-500/80 via-emerald-500/50 to-transparent',
      value: 'text-emerald-400',
      icon: 'text-emerald-500/70',
      glow: 'hover:shadow-emerald-500/10',
    },
    warning: {
      gradient: 'from-amber-500/80 via-amber-500/50 to-transparent',
      value: 'text-amber-400',
      icon: 'text-amber-500/70',
      glow: 'hover:shadow-amber-500/10',
    },
    info: {
      gradient: 'from-sky-500/80 via-sky-500/50 to-transparent',
      value: 'text-sky-400',
      icon: 'text-sky-500/70',
      glow: 'hover:shadow-sky-500/10',
    },
  };

  const styles = accentStyles[accentColor];

  return (
    <div 
      className={cn(
        "stat-card group p-5 opacity-0 animate-fade-in-up hover-lift",
        styles.glow,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top accent line */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r",
        styles.gradient
      )} />
      
      {/* Subtle corner glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-radial from-primary/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </p>
          <p className={cn(
            "text-3xl font-bold tracking-tight transition-colors",
            styles.value
          )}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {trend && (
            <p className={cn(
              "text-xs font-medium flex items-center gap-1",
              trendPositive ? "text-emerald-400" : "text-muted-foreground"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                trendPositive ? "bg-emerald-400 animate-pulse-soft" : "bg-muted-foreground"
              )} />
              {trend}
            </p>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border/30 transition-all duration-300 group-hover:scale-105"
        )}>
          <Icon className={cn("w-5 h-5 transition-colors", styles.icon)} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}