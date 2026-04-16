// ---------------------------------------------------------------------------
// useTheme — applies the correct theme class to <html> based on settings store
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Synchronizes the settings store's `theme` value with the `dark` class on
 * the document root element. When set to "system", it follows the OS
 * preference via `matchMedia`.
 *
 * Call once in App.tsx — the effect re-runs whenever the theme setting changes.
 */
export function useTheme(): void {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(isDark: boolean) {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    if (theme === 'dark') {
      applyTheme(true);
      return;
    }

    if (theme === 'light') {
      applyTheme(false);
      return;
    }

    // "system" — follow OS preference and listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mediaQuery.matches);

    function handleChange(e: MediaQueryListEvent) {
      applyTheme(e.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}
