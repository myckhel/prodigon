// ---------------------------------------------------------------------------
// ModelSelector — dropdown for choosing the active LLM model
// ---------------------------------------------------------------------------

import { MODELS } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

export default function ModelSelector() {
  const model = useSettingsStore((s) => s.model);
  const setModel = useSettingsStore((s) => s.setModel);

  const selectedModel = MODELS.find((m) => m.id === model);

  return (
    <div className="space-y-2">
      <label
        htmlFor="model-select"
        className="block text-sm font-medium text-foreground"
      >
        Model
      </label>

      <select
        id="model-select"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'focus:ring-offset-background',
          'appearance-none cursor-pointer',
        )}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      {selectedModel && (
        <p className="text-xs text-muted-foreground">{selectedModel.description}</p>
      )}
    </div>
  );
}
