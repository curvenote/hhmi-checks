import { useCallback, useEffect, useState } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui } from '@curvenote/scms-core';
import { Info } from 'lucide-react';
import type { SwitchOptionDescriptor } from './settings-config.js';

export const INTENT_UPDATE_SETTING = 'text-integrity-update-setting';

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

type ActionData = { error?: { type?: string; message: string }; success?: boolean };

function submitUpdate(
  fetcher: ReturnType<typeof useFetcher<ActionData>>,
  name: string,
  value: string,
) {
  fetcher.submit({ intent: INTENT_UPDATE_SETTING, name, value }, { method: 'post' });
}

export function SwitchFormRow({ descriptor }: { descriptor: SwitchOptionDescriptor }) {
  if (descriptor.kind === 'smallMatches') {
    return <SmallMatchesFormRow descriptor={descriptor} />;
  }
  return <BooleanSwitchFormRow descriptor={descriptor} />;
}

function BooleanSwitchFormRow({
  descriptor,
}: {
  descriptor: Extract<SwitchOptionDescriptor, { kind: 'boolean' }>;
}) {
  const fetcher = useFetcher<ActionData>();
  const revalidator = useRevalidator();
  const [checked, setChecked] = useState(descriptor.defaultValue);

  useEffect(() => {
    setChecked(descriptor.defaultValue);
  }, [descriptor.defaultValue]);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    if (fetcher.data.error) {
      ui.toastError(fetcher.data.error.message);
      setChecked(descriptor.defaultValue);
      return;
    }
    if (fetcher.data.success) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, descriptor.defaultValue, revalidator]);

  const onCheckedChange = useCallback(
    (next: boolean) => {
      if (descriptor.disabled) return;
      setChecked(next);
      submitUpdate(fetcher, descriptor.name, next ? 'true' : 'false');
    },
    [fetcher, descriptor.name, descriptor.disabled],
  );

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 py-2 ${descriptor.disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium">{descriptor.label}</span>
        <SettingHint description={descriptor.description} />
      </div>
      <ui.Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={descriptor.disabled}
        aria-label={descriptor.label}
        className="h-[1.15rem] w-8 shrink-0 cursor-pointer data-[state=checked]:bg-primary disabled:cursor-not-allowed"
      />
    </div>
  );
}

const SMALL_MATCH_MAX = 999;

function SmallMatchesFormRow({
  descriptor,
}: {
  descriptor: Extract<SwitchOptionDescriptor, { kind: 'smallMatches' }>;
}) {
  const fetcher = useFetcher<ActionData>();
  const revalidator = useRevalidator();
  const [draft, setDraft] = useState(() => String(descriptor.wordThreshold));

  useEffect(() => {
    setDraft(String(descriptor.wordThreshold));
  }, [descriptor.wordThreshold]);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    if (fetcher.data.error) {
      ui.toastError(fetcher.data.error.message);
      setDraft(String(descriptor.wordThreshold));
      return;
    }
    if (fetcher.data.success) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, descriptor.wordThreshold, revalidator]);

  const commit = useCallback(() => {
    if (descriptor.disabled) return;
    let t = Math.floor(Number.parseInt(draft, 10));
    if (Number.isNaN(t)) t = descriptor.wordThreshold;
    t = Math.min(SMALL_MATCH_MAX, Math.max(0, t));
    setDraft(String(t));
    submitUpdate(fetcher, descriptor.name, String(t));
  }, [descriptor.disabled, draft, descriptor.wordThreshold, fetcher, descriptor.name]);

  return (
    <div
      className={`flex flex-col gap-2 py-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between ${descriptor.disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium">{descriptor.label}</span>
        <SettingHint description={descriptor.description} />
      </div>
      <div className="flex w-full max-w-xs flex-col items-stretch gap-1 sm:w-auto sm:items-end">
        <ui.Input
          type="number"
          min={0}
          max={SMALL_MATCH_MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          disabled={descriptor.disabled}
          className="h-9 w-full font-mono text-sm sm:w-24"
          aria-label="Minimum word count for a match to count toward similarity (0 = off)"
        />
        <p className="text-xs text-muted-foreground sm:text-right">
          Matches shorter than this many words are ignored. Use 0 to disable. Typical value is 8.
        </p>
      </div>
    </div>
  );
}
