// ---------------------------------------------------------------------------
// JobsView — split layout with submit form and job list
// ---------------------------------------------------------------------------

import React from 'react';
import { JobSubmitForm } from './job-submit-form';
import { JobList } from './job-list';

export function JobsView() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Batch Jobs</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Submit multiple prompts for parallel processing.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Submit Form */}
        <div className="w-full lg:w-1/2">
          <JobSubmitForm />
        </div>

        {/* Right: Job List */}
        <div className="w-full lg:w-1/2">
          <JobList />
        </div>
      </div>
    </div>
  );
}
