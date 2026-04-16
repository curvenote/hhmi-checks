import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';

const INTENT_SAVE_AUTH = 'text-integrity-save-auth';

type SaveActionData = {
  error?: { type: string; message: string };
  success?: boolean;
};

export type TextIntegrityCredentials = {
  apiKey: string;
  /** Extension YAML + stored override; empty save clears stored value (YAML or "default"). */
  relayInstanceId: string;
};

type Props = {
  displayConfig: Record<string, unknown>;
  /** Called whenever relay instance or API key value changes (ref-safe; parent need not memoize). */
  onCredentialsChange: (c: TextIntegrityCredentials) => void;
};

export function TextIntegrityCredentialsForm({ displayConfig, onCredentialsChange }: Props) {
  const initialRelayInstanceId =
    typeof displayConfig.relayInstanceId === 'string' ? displayConfig.relayInstanceId : '';
  const [turnitinApiKey, setTurnitinApiKey] = useState('');
  const [relayInstanceId, setRelayInstanceId] = useState(initialRelayInstanceId);

  const saveFetcher = useFetcher<SaveActionData>();
  const savePrevStateRef = useRef(saveFetcher.state);
  const onCredentialsChangeRef = useRef(onCredentialsChange);
  onCredentialsChangeRef.current = onCredentialsChange;

  const clearTransientApiKey = useCallback(() => setTurnitinApiKey(''), []);

  useEffect(() => {
    setRelayInstanceId(
      typeof displayConfig.relayInstanceId === 'string' ? displayConfig.relayInstanceId : '',
    );
  }, [displayConfig.relayInstanceId]);

  useEffect(() => {
    onCredentialsChangeRef.current({
      apiKey: turnitinApiKey,
      relayInstanceId,
    });
  }, [turnitinApiKey, relayInstanceId]);

  useEffect(() => {
    const prev = savePrevStateRef.current;
    savePrevStateRef.current = saveFetcher.state;
    if (saveFetcher.state !== 'idle' || prev === 'idle' || !saveFetcher.data) return;

    const d = saveFetcher.data;
    if (d.error) {
      ui.toastError(d.error.message);
    } else if (d.success) {
      ui.toastSuccess('Settings saved');
      clearTransientApiKey();
    }
  }, [saveFetcher.state, saveFetcher.data, clearTransientApiKey]);

  const isSaving = saveFetcher.state !== 'idle';
  const fieldsDisabled = isSaving;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        TCA base URL and provider API credentials for checks are configured on{' '}
        <span className="font-medium">checks-relay</span> per instance. Save an API key here only if
        SCMS must authorize direct GETs to TCA resource URLs (e.g. PDF download).
      </p>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ti-relay-instance">
          Checks relay instance id
        </label>
        <ui.TextField
          id="ti-relay-instance"
          name="relayInstanceId"
          value={relayInstanceId}
          onChange={(e) => setRelayInstanceId(e.target.value)}
          placeholder="default"
          disabled={fieldsDisabled}
          className="w-full font-mono"
        />
        <p className="text-xs text-muted-foreground">
          URL segment for checks-relay (paths include <span className="font-mono">/instances/</span>).
          Set in extension YAML or here (stored value wins). Leave blank and save to clear a stored
          override, then extension YAML or the literal <span className="font-mono">default</span>.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ti-key">
          Turnitin API key (SCMS download only)
        </label>
        <ui.TextField
          id="ti-key"
          type="password"
          name="apiKey"
          value={turnitinApiKey}
          onChange={(e) => setTurnitinApiKey(e.target.value)}
          placeholder="Leave blank when saving to keep current key"
          disabled={fieldsDisabled}
          className="w-full font-mono"
          autoComplete="off"
        />
      </div>

      <saveFetcher.Form method="post" className="pt-1">
        <input type="hidden" name="intent" value={INTENT_SAVE_AUTH} />
        <input type="hidden" name="apiKey" value={turnitinApiKey} />
        <input type="hidden" name="relayInstanceId" value={relayInstanceId} />
        <ui.StatefulButton
          type="submit"
          disabled={fieldsDisabled}
          size="sm"
          overlayBusy
          busy={isSaving}
        >
          Save changes
        </ui.StatefulButton>
      </saveFetcher.Form>
    </div>
  );
}
