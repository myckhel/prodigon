// ---------------------------------------------------------------------------
// Router — React Router configuration with layout wrapper
// ---------------------------------------------------------------------------

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { ChatPage } from '@/pages/chat-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { JobsPage } from '@/pages/jobs-page';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/jobs" element={<JobsPage />} />
      </Route>
    </Routes>
  );
}
