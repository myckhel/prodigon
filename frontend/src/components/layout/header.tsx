// ---------------------------------------------------------------------------
// Header — top bar with mobile menu, page title, model selector, theme toggle
// ---------------------------------------------------------------------------

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';
import { MODELS } from '@/lib/constants';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Chat',
  '/dashboard': 'Dashboard',
  '/jobs': 'Batch Jobs',
};

export function Header() {
  const location = useLocation();
  const { theme, setTheme, model, setModel, toggleSidebar, sidebarOpen } =
    useSettingsStore();

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Prodigon';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
      {/* Left — Hamburger (visible when sidebar is closed or on mobile) */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-2 rounded-lg hover:bg-accent transition-colors',
            sidebarOpen ? 'hidden lg:hidden' : 'block',
            // Always show on small screens
            'md:hidden',
            // Show when sidebar is collapsed on desktop
            !sidebarOpen && 'md:block',
          )}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Page Title */}
        <h1 className="text-base font-semibold">{pageTitle}</h1>
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-2">
        {/* Model Selector */}
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="h-8 px-2 pr-7 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
