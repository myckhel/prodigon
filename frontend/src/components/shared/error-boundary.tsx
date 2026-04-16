// ---------------------------------------------------------------------------
// ErrorBoundary — catches unhandled render errors and shows a fallback UI
// ---------------------------------------------------------------------------
//
// React error boundaries MUST be class components — there is no hook equivalent.
// This wraps the entire app to prevent a blank white screen on unexpected errors.

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { truncate } from '@/lib/utils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this would go to Sentry / your error tracking service
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Something went wrong
              </h1>
              {this.state.error && (
                <p className="text-sm text-muted-foreground break-words">
                  {truncate(this.state.error.message, 200)}
                </p>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-5 py-2.5',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
