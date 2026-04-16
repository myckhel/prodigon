// ---------------------------------------------------------------------------
// ChatPage — ensures an active session exists, then renders the chat view
// ---------------------------------------------------------------------------

import React, { useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { ChatView } from '@/components/chat/chat-view';

export function ChatPage() {
  const { activeSessionId, createSession } = useChatStore();

  useEffect(() => {
    if (!activeSessionId) {
      createSession();
    }
  }, [activeSessionId, createSession]);

  if (!activeSessionId) return null;

  return <ChatView sessionId={activeSessionId} />;
}
