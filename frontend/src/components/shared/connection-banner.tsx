// ---------------------------------------------------------------------------
// ConnectionBanner — fixed red banner shown when the backend is unreachable
// ---------------------------------------------------------------------------

import { useHealthStore } from '@/stores/health-store';
import { Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConnectionBanner() {
  const isConnected = useHealthStore((s) => s.isConnected);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed top-0 inset-x-0 z-50',
        'flex items-center justify-center gap-3 px-4 py-2.5',
        'bg-destructive text-destructive-foreground text-sm font-medium',
        'transition-transform duration-300 ease-in-out',
        isConnected ? '-translate-y-full' : 'translate-y-0',
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Unable to connect to the server</span>
      <span className="flex items-center gap-1.5 text-destructive-foreground/80">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Retrying...
      </span>
    </div>
  );
}
