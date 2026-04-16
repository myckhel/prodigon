// ---------------------------------------------------------------------------
// Jobs Store — tracks batch job submissions and their status
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { JobResponse } from '@/api/types';

interface JobsState {
  jobs: JobResponse[];

  addJob: (job: JobResponse) => void;
  updateJob: (jobId: string, updates: Partial<JobResponse>) => void;
  getJob: (jobId: string) => JobResponse | undefined;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],

  addJob: (job) => {
    set((state) => ({ jobs: [job, ...state.jobs] }));
  },

  updateJob: (jobId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.job_id === jobId ? { ...j, ...updates } : j,
      ),
    }));
  },

  getJob: (jobId) => {
    return get().jobs.find((j) => j.job_id === jobId);
  },
}));
