// ---------------------------------------------------------------------------
// Settings Store — theme, model selection, sidebar state, generation params
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '@/lib/constants';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  sidebarOpen: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setSystemPrompt: (prompt: string) => void;
  resetToDefaults: () => void;
}

/** Resolve and apply the effective theme class on <html> */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Read initial theme from localStorage or default to system
const storedTheme = (typeof localStorage !== 'undefined'
  ? (localStorage.getItem('prodigon-theme') as Theme | null)
  : null) ?? 'system';
applyTheme(storedTheme);

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: storedTheme,
  sidebarOpen: true,
  model: DEFAULT_MODEL,
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
  systemPrompt: '',

  setTheme: (theme) => {
    localStorage.setItem('prodigon-theme', theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setModel: (model) => set({ model }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  resetToDefaults: () => {
    localStorage.removeItem('prodigon-theme');
    applyTheme('system');
    set({
      theme: 'system',
      model: DEFAULT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      systemPrompt: '',
    });
  },
}));
