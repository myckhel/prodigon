// ---------------------------------------------------------------------------
// useKeyboardShortcuts — registers global keyboard shortcut handlers
// ---------------------------------------------------------------------------

import { useEffect } from 'react';

export interface ShortcutMap {
  [combo: string]: (e: KeyboardEvent) => void;
}

/**
 * Register global keyboard shortcuts.
 *
 * Shortcut format: modifier+key, e.g. "mod+k", "mod+/", "escape"
 * "mod" maps to Cmd on macOS and Ctrl everywhere else.
 *
 * @example
 * useKeyboardShortcuts({
 *   'mod+k': () => openSearch(),
 *   'mod+/': () => toggleSidebar(),
 *   'escape': () => closeModal(),
 * });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      for (const [combo, callback] of Object.entries(shortcuts)) {
        const parts = combo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const needsMod = parts.includes('mod');
        const needsShift = parts.includes('shift');

        if (needsMod && !mod) continue;
        if (needsShift && !e.shiftKey) continue;
        if (!needsMod && (e.metaKey || e.ctrlKey)) continue;

        if (e.key.toLowerCase() === key) {
          e.preventDefault();
          callback(e);
          return;
        }
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
