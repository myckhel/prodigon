// ---------------------------------------------------------------------------
// App — root component that ties together global providers and routing
// ---------------------------------------------------------------------------

import { AppRouter } from '@/router';
import ErrorBoundary from '@/components/shared/error-boundary';
import ConnectionBanner from '@/components/shared/connection-banner';
import { useTheme } from '@/hooks/use-theme';
import { useHealthPoll } from '@/hooks/use-health-poll';

export default function App() {
  // Apply theme (dark/light/system) on mount and on change
  useTheme();

  // Start polling service health globally
  useHealthPoll();

  return (
    <ErrorBoundary>
      <ConnectionBanner />
      <AppRouter />
    </ErrorBoundary>
  );
}
