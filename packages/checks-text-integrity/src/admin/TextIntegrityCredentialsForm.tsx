import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';

const INTENT_SAVE_AUTH = 'text-integrity-save-auth';

type SaveActionData = {
  error?: { type: string; message: string };
  success?: boolean;
};

export type TextIntegrityCredentials = {
  apiBaseUrl: string;
  apiKey: string;
  keyName: string;
};

type Props = {
  displayConfig: Record<string, unknown>;
  /** Called whenever URL, key name, or API key value changes (ref-safe; parent need not memoize). */
  onCredentialsChange: (c: TextIntegrityCredentials) => void;
};

export function TextIntegrityCredentialsForm({ displayConfig, onCredentialsChange }: Props) {
  const initialUrl = typeof displayConfig.apiBaseUrl === 'string' ? displayConfig.apiBaseUrl : '';
  const initialKeyName = typeof displayConfig.keyName === 'string' ? displayConfig.keyName : '';
  const [turnitinUrl, setTurnitinUrl] = useState(initialUrl);
  const [turnitinApiKey, setTurnitinApiKey] = useState('');
  const [keyName, setKeyName] = useState(initialKeyName);

  const saveFetcher = useFetcher<SaveActionData>();
  const savePrevStateRef = useRef(saveFetcher.state);
  const onCredentialsChangeRef = useRef(onCredentialsChange);
  onCredentialsChangeRef.current = onCredentialsChange;

  const clearTransientApiKey = useCallback(() => setTurnitinApiKey(''), []);

  useEffect(() => {
    setTurnitinUrl(typeof displayConfig.apiBaseUrl === 'string' ? displayConfig.apiBaseUrl : '');
    setKeyName(typeof displayConfig.keyName === 'string' ? displayConfig.keyName : '');
  }, [displayConfig.apiBaseUrl, displayConfig.keyName]);

  useEffect(() => {
    onCredentialsChangeRef.current({
      apiBaseUrl: turnitinUrl,
      apiKey: turnitinApiKey,
      keyName,
    });
  }, [turnitinUrl, turnitinApiKey, keyName]);

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
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ti-url">
          Turnitin URL
        </label>
        <ui.TextField
          id="ti-url"
          name="apiBaseUrl"
          value={turnitinUrl}
          onChange={(e) => setTurnitinUrl(e.target.value)}
          placeholder="https://your-domain.turnitin.com"
          disabled={fieldsDisabled}
          className="w-full font-mono"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ti-keyname">
          Turnitin API key name
        </label>
        <ui.TextField
          id="ti-keyname"
          name="keyName"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          placeholder="e.g. hhmi-workspace-staging-key-1"
          disabled={fieldsDisabled}
          className="w-full font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Non-secret signing key identifier. Clear the field and save to use deployment config only.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ti-key">
          Turnitin API key
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
        <input type="hidden" name="apiBaseUrl" value={turnitinUrl} />
        <input type="hidden" name="apiKey" value={turnitinApiKey} />
        <input type="hidden" name="keyName" value={keyName} />
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
