// ---------------------------------------------------------------------------
// MetricsCard — simple stat card with icon, value, and label
// ---------------------------------------------------------------------------

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  className?: string;
}

export function MetricsCard({ icon: Icon, value, label, className }: MetricsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow',
        className,
      )}
    >
      <Icon className="h-5 w-5 text-muted-foreground mb-3" />
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
