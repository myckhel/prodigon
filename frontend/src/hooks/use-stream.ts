// ---------------------------------------------------------------------------
// useStream — manages streaming inference lifecycle
// ---------------------------------------------------------------------------

import { useCallback, useRef, useState } from 'react';
import { api } from '@/api/endpoints';
import type { GenerateRequest } from '@/api/types';

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function useStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (req: GenerateRequest, callbacks: StreamCallbacks) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const stream = api.generateStream(req, controller.signal);
        for await (const token of stream) {
          callbacks.onToken(token);
        }
        callbacks.onDone();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          callbacks.onDone(); // user stopped generation
        } else {
          callbacks.onError(
            error instanceof Error ? error.message : 'Stream failed',
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isStreaming, start, stop };
}
