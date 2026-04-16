// ---------------------------------------------------------------------------
// useJobPoll — polls a running/pending job until it completes
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { api } from '@/api/endpoints';
import { useJobsStore } from '@/stores/jobs-store';
import { JOB_POLL_INTERVAL } from '@/lib/constants';

export function useJobPoll(jobId: string, status: string) {
  const updateJob = useJobsStore((s) => s.updateJob);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== 'pending' && status !== 'running') {
      return;
    }

    const poll = async () => {
      try {
        const data = await api.getJob(jobId);
        updateJob(jobId, data);

        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Silently retry on next interval
      }
    };

    poll();
    intervalRef.current = setInterval(poll, JOB_POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, status, updateJob]);
}
