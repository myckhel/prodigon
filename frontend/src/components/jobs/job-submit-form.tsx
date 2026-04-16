// ---------------------------------------------------------------------------
// JobSubmitForm — textarea for entering prompts, one per line, and submitting
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api/endpoints';
import { useJobsStore } from '@/stores/jobs-store';
import { useSettingsStore } from '@/stores/settings-store';

export function JobSubmitForm() {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addJob = useJobsStore((s) => s.addJob);
  const { model, maxTokens } = useSettingsStore();

  const prompts = useMemo(
    () => text.split('\n').filter((line) => line.trim().length > 0),
    [text],
  );

  const handleSubmit = async () => {
    if (prompts.length === 0 || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const job = await api.submitJob({
        prompts,
        model,
        max_tokens: maxTokens,
      });
      addJob(job);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold mb-1">Submit Batch Job</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Each line becomes a separate inference request.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter prompts (one per line)"
        rows={8}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />

      <p className="text-xs text-muted-foreground mt-2 mb-4">
        {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} detected
      </p>

      {error && (
        <p className="text-sm text-destructive mb-3">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={prompts.length === 0 || isSubmitting}
        className={cn(
          'flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors',
          prompts.length > 0 && !isSubmitting
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Process {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </div>
  );
}
