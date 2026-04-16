// ---------------------------------------------------------------------------
// MessageList — scrollable container rendering all messages
// ---------------------------------------------------------------------------

import React from 'react';
import type { ChatMessage } from '@/stores/chat-store';
import { MessageBubble } from './message-bubble';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const { containerRef, sentinelRef } = useAutoScroll([messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={sentinelRef} />
    </div>
  );
}
