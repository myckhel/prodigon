// ---------------------------------------------------------------------------
// StatusIndicator — animated dot showing service health status
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'healthy' | 'down' | 'degraded' | 'unknown';

interface StatusIndicatorProps {
  status: Status;
  className?: string;
}

const STATUS_CONFIG: Record<Status, { color: string; pulse: boolean }> = {
  healthy: { color: 'bg-green-500', pulse: true },
  down: { color: 'bg-red-500', pulse: false },
  degraded: { color: 'bg-yellow-500', pulse: false },
  unknown: { color: 'bg-gray-400', pulse: false },
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={cn('relative flex h-2.5 w-2.5', className)}>
      {config.pulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            config.color,
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          config.color,
        )}
      />
    </span>
  );
}
