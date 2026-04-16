// ---------------------------------------------------------------------------
// JobResults — expandable section showing prompt/response pairs
// ---------------------------------------------------------------------------

import React from 'react';
import type { JobResponse } from '@/api/types';

interface JobResultsProps {
  job: JobResponse;
  prompts?: string[];
}

export function JobResults({ job }: JobResultsProps) {
  if (job.status === 'failed' && job.error) {
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-sm text-destructive">{job.error}</p>
      </div>
    );
  }

  if (job.results.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-sm text-muted-foreground">No results yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {job.results.map((result, index) => (
        <div key={index} className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground italic mb-1.5">
            Prompt #{index + 1}
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{result}</p>
        </div>
      ))}
    </div>
  );
}
