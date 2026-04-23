// ---------------------------------------------------------------------------
// MessageBubble — renders a single user or assistant message
// ---------------------------------------------------------------------------

import { RefreshCw } from 'lucide-react';
import { cn, formatTime, formatLatency } from '@/lib/utils';
import type { ChatMessage } from '@/stores/chat-store';
import { MarkdownRenderer } from './markdown-renderer';
import { TypingIndicator } from './typing-indicator';

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasError = !!message.error;
  const showTyping = message.isStreaming && !message.content;

  return (
    <div
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] md:max-w-[70%] px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-card border border-border rounded-2xl rounded-bl-md',
          hasError && !isUser && 'border-destructive',
        )}
      >
        {/* Assistant body */}
        {!isUser && (
          <>
            {showTyping ? (
              <TypingIndicator />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer
                  content={message.content}
                  streaming={message.isStreaming ?? false}
                />
              </div>
            )}

            {/* Error state */}
            {hasError && (
              <div className="mt-2 pt-2 border-t border-destructive/30">
                <p className="text-sm text-destructive">{message.error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1.5 mt-1.5 text-xs text-destructive hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* User body */}
        {isUser && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Footer: timestamp, model badge, latency */}
        <div
          className={cn(
            'flex items-center gap-2 mt-1.5 text-xs',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && message.model && (
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
              {message.model.split('-').slice(0, 2).join(' ')}
            </span>
          )}
          {!isUser && message.latencyMs != null && (
            <span>{formatLatency(message.latencyMs)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
