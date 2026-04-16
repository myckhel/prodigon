// ---------------------------------------------------------------------------
// SettingsDialog — modal overlay for all user-configurable preferences
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useSettingsStore, type Theme } from '@/stores/settings-store';
import { cn } from '@/lib/utils';
import ModelSelector from './model-selector';
import TemperatureSlider from './temperature-slider';
import SystemPromptEditor from './system-prompt-editor';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const maxTokens = useSettingsStore((s) => s.maxTokens);
  const setMaxTokens = useSettingsStore((s) => s.setMaxTokens);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent background scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={cn(
          'relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'rounded-lg border border-border bg-card text-card-foreground shadow-lg',
          'mx-4',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className={cn(
              'rounded-md p-1.5 text-muted-foreground',
              'hover:bg-secondary hover:text-foreground',
              'transition-colors',
            )}
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="divide-y divide-border">
          {/* Model section */}
          <div className="px-6 py-5">
            <ModelSelector />
          </div>

          {/* Generation section */}
          <div className="px-6 py-5 space-y-5">
            <TemperatureSlider />

            {/* Max tokens */}
            <div className="space-y-2">
              <label
                htmlFor="max-tokens"
                className="block text-sm font-medium text-foreground"
              >
                Max Tokens
              </label>
              <input
                id="max-tokens"
                type="number"
                min={1}
                max={32768}
                value={maxTokens}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 32768) setMaxTokens(v);
                }}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2',
                  'text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'focus:ring-offset-background',
                )}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens the model will generate (1 - 32,768).
              </p>
            </div>
          </div>

          {/* System prompt section */}
          <div className="px-6 py-5">
            <SystemPromptEditor />
          </div>

          {/* Appearance section */}
          <div className="px-6 py-5 space-y-2">
            <span className="block text-sm font-medium text-foreground">
              Appearance
            </span>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-4 py-2 text-sm',
                    'transition-colors',
                    theme === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={resetToDefaults}
            className={cn(
              'text-sm text-muted-foreground',
              'hover:text-foreground transition-colors',
            )}
          >
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className={cn(
              'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
