// ---------------------------------------------------------------------------
// SystemPromptEditor — textarea for customizing the system instruction
// ---------------------------------------------------------------------------

import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

const MAX_CHARS = 2000;

export default function SystemPromptEditor() {
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);
  const setSystemPrompt = useSettingsStore((s) => s.setSystemPrompt);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setSystemPrompt(value);
    }
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="system-prompt"
        className="block text-sm font-medium text-foreground"
      >
        System Prompt
      </label>

      <textarea
        id="system-prompt"
        value={systemPrompt}
        onChange={handleChange}
        placeholder="You are a helpful AI assistant..."
        rows={4}
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'focus:ring-offset-background',
          'resize-y min-h-[80px]',
        )}
      />

      <div className="flex justify-end">
        <span
          className={cn(
            'text-xs',
            systemPrompt.length > MAX_CHARS * 0.9
              ? 'text-destructive'
              : 'text-muted-foreground',
          )}
        >
          {systemPrompt.length} / {MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
