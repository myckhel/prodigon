// ---------------------------------------------------------------------------
// HealthCard — displays the health status of a single service
// ---------------------------------------------------------------------------

import React from 'react';
import type { ServiceHealth } from '@/hooks/use-health-poll';
import { StatusIndicator } from './status-indicator';
import { formatLatency } from '@/lib/utils';

interface HealthCardProps {
  service: ServiceHealth;
}

export function HealthCard({ service }: HealthCardProps) {
  const lastCheckedStr =
    service.lastChecked > 0
      ? new Date(service.lastChecked).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'Never';

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{service.name}</h3>
        <StatusIndicator status={service.status} />
      </div>

      {/* Status text */}
      <p className="text-sm capitalize mb-2">
        {service.status === 'healthy' ? (
          <span className="text-green-600 dark:text-green-400">Healthy</span>
        ) : service.status === 'down' ? (
          <span className="text-red-500">Unavailable</span>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        )}
      </p>

      {/* Response time */}
      {service.responseTimeMs != null && (
        <p className="text-xs text-muted-foreground mb-1">
          Response: {formatLatency(service.responseTimeMs)}
        </p>
      )}

      {/* Version / Env */}
      {service.version && (
        <p className="text-xs text-muted-foreground">
          v{service.version} &middot; {service.environment ?? 'unknown'}
        </p>
      )}

      {/* Last checked */}
      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Last checked: {lastCheckedStr}
      </p>
    </div>
  );
}
