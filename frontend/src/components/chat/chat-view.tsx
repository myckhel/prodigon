// ---------------------------------------------------------------------------
// ChatView — main chat orchestrator: handles send, stream, and layout
// ---------------------------------------------------------------------------

import React, { useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useStream } from '@/hooks/use-stream';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { EmptyChat } from './empty-chat';
import { Square } from 'lucide-react';

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const { activeSession, addMessage, updateMessage, appendToMessage } = useChatStore();
  const { model, temperature, maxTokens } = useSettingsStore();
  const { isStreaming, start, stop } = useStream();

  const session = activeSession();
  const messages = session?.messages ?? [];

  const handleSend = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isStreaming) return;

      // 1. Add user message
      addMessage(sessionId, { role: 'user', content: prompt });

      // 2. Create assistant placeholder
      const assistantId = addMessage(sessionId, {
        role: 'assistant',
        content: '',
        model,
        isStreaming: true,
      });

      const startTime = performance.now();

      // 3. Stream response
      await start(
        {
          prompt,
          model,
          temperature,
          max_tokens: maxTokens,
        },
        {
          onToken: (token) => {
            appendToMessage(sessionId, assistantId, token);
          },
          onDone: () => {
            const latencyMs = Math.round(performance.now() - startTime);
            updateMessage(sessionId, assistantId, {
              isStreaming: false,
              latencyMs,
            });
          },
          onError: (error) => {
            updateMessage(sessionId, assistantId, {
              isStreaming: false,
              error,
            });
          },
        },
      );
    },
    [sessionId, model, temperature, maxTokens, isStreaming, addMessage, updateMessage, appendToMessage, start],
  );

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <EmptyChat onSelectPrompt={handleSend} />
      ) : (
        <>
          <MessageList messages={messages} />

          {/* Stop button */}
          {isStreaming && (
            <div className="flex justify-center py-2 shrink-0">
              <button
                onClick={stop}
                className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-full border border-border hover:bg-accent transition-colors"
              >
                <Square className="h-3 w-3 fill-current" />
                Stop generating
              </button>
            </div>
          )}
        </>
      )}

      <div className="px-4 pb-4 pt-2 shrink-0">
        <MessageInput
          onSend={handleSend}
          isStreaming={isStreaming}
          onStop={stop}
        />
      </div>
    </div>
  );
}
