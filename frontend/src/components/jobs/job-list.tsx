// ---------------------------------------------------------------------------
// JobList — scrollable list of submitted batch jobs
// ---------------------------------------------------------------------------

import React from 'react';
import { Layers } from 'lucide-react';
import { useJobsStore } from '@/stores/jobs-store';
import { JobCard } from './job-card';

export function JobList() {
  const jobs = useJobsStore((s) => s.jobs);

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4">
          <Layers className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No jobs submitted yet
        </p>
        <p className="text-xs text-muted-foreground/70">
          Submit prompts on the left to create a batch job.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto">
      {jobs.map((job) => (
        <JobCard key={job.job_id} job={job} />
      ))}
    </div>
  );
}
