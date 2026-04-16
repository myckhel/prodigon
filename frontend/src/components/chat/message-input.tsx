// ---------------------------------------------------------------------------
// MessageInput — auto-resizing textarea with send/stop controls
// ---------------------------------------------------------------------------

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SendHorizontal, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function MessageInput({ onSend, isStreaming, onStop }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Clamp between 1 row (~40px) and 6 rows (~168px)
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    // Reset height after clearing
    setTimeout(() => resize(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div
      className={cn(
        'flex items-end gap-2 border border-border rounded-2xl px-4 py-3 bg-card transition-shadow',
        'focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent',
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Prodigon..."
        rows={1}
        disabled={isStreaming}
        className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[24px]"
      />

      {isStreaming ? (
        <button
          onClick={onStop}
          className="shrink-0 p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          aria-label="Stop generating"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'shrink-0 p-2 rounded-xl transition-colors',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
