// ---------------------------------------------------------------------------
// EmptyChat — welcome screen with suggested prompts
// ---------------------------------------------------------------------------

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '@/lib/constants';

interface EmptyChatProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyChat({ onSelectPrompt }: EmptyChatProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-semibold mb-2 text-center">
        How can I help you today?
      </h2>
      <p className="text-muted-foreground text-sm mb-8 text-center">
        Ask anything or pick a suggestion below.
      </p>

      {/* Suggested Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card text-left text-sm hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <span className="flex-1 text-foreground leading-relaxed">
              {prompt}
            </span>
            <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
