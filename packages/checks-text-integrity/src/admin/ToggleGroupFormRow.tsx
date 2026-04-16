import { useCallback, useEffect, useState } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { cn, ui } from '@curvenote/scms-core';
import { Info } from 'lucide-react';
import type { ToggleGroupOptionDescriptor } from './settings-config.js';
import { INTENT_UPDATE_SETTING } from './SwitchFormRow.js';

type ActionData = { error?: { type?: string; message: string }; success?: boolean };

function SettingHint({ description }: { description: string }) {
  return (
    <ui.SimpleTooltip title={description} asChild>
      <button
        type="button"
        className="inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="More information"
      >
        <Info className="size-4" aria-hidden />
      </button>
    </ui.SimpleTooltip>
  );
}

export function ToggleGroupFormRow({ descriptor }: { descriptor: ToggleGroupOptionDescriptor }) {
  const fetcher = useFetcher<ActionData>();
  const revalidator = useRevalidator();
  const [value, setValue] = useState<string>(descriptor.defaultValue);

  useEffect(() => {
    setValue(descriptor.defaultValue);
  }, [descriptor.defaultValue]);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    if (fetcher.data.error) {
      ui.toastError(fetcher.data.error.message);
      setValue(descriptor.defaultValue);
      return;
    }
    if (fetcher.data.success) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, descriptor.defaultValue, revalidator]);

  const onValueChange = useCallback(
    (newValue: string) => {
      if (descriptor.disabled || !newValue) return;
      setValue(newValue);
      fetcher.submit(
        { intent: INTENT_UPDATE_SETTING, name: descriptor.name, value: newValue },
        { method: 'post' },
      );
    },
    [fetcher, descriptor.name, descriptor.disabled],
  );

  return (
    <div className={`space-y-2 py-2 ${descriptor.disabled ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{descriptor.label}</span>
        <SettingHint description={descriptor.description} />
      </div>
      <ui.ToggleGroup
        type="single"
        disabled={descriptor.disabled}
        className={cn(
          'inline-flex w-fit cursor-pointer flex-row items-stretch gap-1 rounded-lg border border-border bg-muted/40 p-1 shadow-xs',
          descriptor.disabled && 'cursor-not-allowed',
        )}
        value={value}
        aria-label={descriptor.label}
        onValueChange={onValueChange}
      >
        {descriptor.options.map((opt) => (
          <ui.ToggleGroupItem
            key={opt.value}
            value={opt.value}
            title={opt.description}
            aria-label={`${opt.label}: ${opt.description}`}
            disabled={descriptor.disabled}
            className={cn(
              'box-border w-[4.75rem] flex-none cursor-pointer rounded-md border-0 px-2 py-1.5 text-center text-sm font-semibold shadow-none',
              'shrink-0',
              'transition-colors',
              'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm',
              'data-[state=off]:bg-transparent data-[state=off]:text-muted-foreground',
              'data-[state=off]:hover:bg-background/90 data-[state=off]:hover:text-foreground',
              'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/40',
              'first:rounded-md last:rounded-md',
              descriptor.disabled && 'pointer-events-none',
            )}
          >
            {opt.label}
          </ui.ToggleGroupItem>
        ))}
      </ui.ToggleGroup>
    </div>
  );
}
