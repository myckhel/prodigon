// ---------------------------------------------------------------------------
// TemperatureSlider — range input for controlling generation randomness
// ---------------------------------------------------------------------------

import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

export default function TemperatureSlider() {
  const temperature = useSettingsStore((s) => s.temperature);
  const setTemperature = useSettingsStore((s) => s.setTemperature);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="temperature-slider"
          className="text-sm font-medium text-foreground"
        >
          Temperature
        </label>
        <span className="text-sm font-mono text-muted-foreground">
          {temperature.toFixed(1)}
        </span>
      </div>

      <input
        id="temperature-slider"
        type="range"
        min={0}
        max={2}
        step={0.1}
        value={temperature}
        onChange={(e) => setTemperature(parseFloat(e.target.value))}
        className={cn(
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-secondary',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-primary',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-primary',
          '[&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:cursor-pointer',
        )}
      />

      <p className="text-xs text-muted-foreground">
        Lower values produce more focused and deterministic output. Higher values
        increase creativity and randomness.
      </p>
    </div>
  );
}
