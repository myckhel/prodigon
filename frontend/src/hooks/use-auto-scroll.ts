// ---------------------------------------------------------------------------
// useAutoScroll — keeps a scrollable container pinned to the bottom
// ---------------------------------------------------------------------------

import { useEffect, useRef, useCallback } from 'react';

export function useAutoScroll(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, sentinelRef, scrollToBottom };
}
