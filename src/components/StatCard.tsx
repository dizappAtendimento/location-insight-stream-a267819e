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
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border border-border/50 p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 opacity-0 animate-fade-in-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/80 to-primary/20" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-primary">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trendPositive ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/50">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
