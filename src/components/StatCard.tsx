import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
              {title}
            </p>
            <p className="text-3xl font-bold text-primary mt-2">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-sm mt-1",
                  trendPositive ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {trend}
              </p>
            )}
          </div>
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
