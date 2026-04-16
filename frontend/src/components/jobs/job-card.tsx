// ---------------------------------------------------------------------------
// JobCard — displays a single batch job with status, progress, and results
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn, truncate } from '@/lib/utils';
import type { JobResponse, JobStatus } from '@/api/types';
import { useJobPoll } from '@/hooks/use-job-poll';
import { JobResults } from './job-results';

interface JobCardProps {
  job: JobResponse;
}

const STATUS_STYLES: Record<JobStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PROGRESS_COLORS: Record<JobStatus, string> = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export function JobCard({ job }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Poll while pending/running
  useJobPoll(job.job_id, job.status);

  const progress =
    job.total_prompts > 0
      ? Math.round((job.completed_prompts / job.total_prompts) * 100)
      : 0;

  const createdStr = new Date(job.created_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <code className="text-xs font-mono text-muted-foreground">
          {truncate(job.job_id, 18)}
        </code>
        <span
          className={cn(
            'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full',
            STATUS_STYLES[job.status],
          )}
        >
          {job.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted mb-2 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            PROGRESS_COLORS[job.status],
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress text */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>
          {job.completed_prompts}/{job.total_prompts} completed
        </span>
        <span>{createdStr}</span>
      </div>

      {/* Expand/collapse */}
      {(job.status === 'completed' || job.status === 'failed') && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {expanded ? 'Hide results' : 'Show results'}
        </button>
      )}

      {expanded && <JobResults job={job} />}
    </div>
  );
}
