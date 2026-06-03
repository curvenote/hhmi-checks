'use client';

import { useState } from 'react';
import { ui } from '@curvenote/scms-core';

export type TextIntegrityEulaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html?: string;
  url?: string;
  version: string;
  language?: string;
  busy?: boolean;
  onAccept: (params: { version: string; language: string }) => void;
};

/** Wrap plain-text EULA (sandbox) in a minimal document for sandboxed srcDoc display. */
function eulaSrcDoc(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  if (/<[a-z][\s>]/i.test(trimmed)) return trimmed;
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:1rem;line-height:1.5;color:#1c1917;}</style></head><body><p>${escaped}</p></body></html>`;
}

export function TextIntegrityEulaDialog({
  open,
  onOpenChange,
  html,
  url,
  version,
  language = 'en-US',
  busy = false,
  onAccept,
}: TextIntegrityEulaDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const srcDoc = html?.trim() ? eulaSrcDoc(html) : undefined;

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmed(false);
    onOpenChange(next);
  };

  return (
    <ui.SimpleDialog
      open={open}
      variant="wide"
      onOpenChange={handleOpenChange}
      title="Turnitin End User License Agreement"
      description="You must read and accept the agreement before iThenticate checks can run."
      footerButtons={[
        {
          label: 'Cancel',
          variant: 'outline',
          onClick: () => handleOpenChange(false),
        },
        {
          label: 'Accept',
          disabled: !confirmed || busy,
          onClick: () => onAccept({ version, language }),
        },
      ]}
    >
      <div className="space-y-4">
        {srcDoc ? (
          <iframe
            title="Turnitin End User License Agreement"
            sandbox=""
            srcDoc={srcDoc}
            className="w-full h-[min(60vh,480px)] border border-stone-200 rounded-sm bg-white"
            referrerPolicy="no-referrer"
          />
        ) : url ? (
          <p className="text-sm text-muted-foreground">
            Cached agreement text is not available yet.{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
              Open the Turnitin EULA page
            </a>{' '}
            in a new tab, or try again after the cache has refreshed.
          </p>
        ) : (
          <ui.SimpleAlert
            type="warning"
            message="EULA content is not available. Try again later."
          />
        )}
        <label className="flex gap-2 items-start cursor-pointer">
          <ui.Checkbox
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            disabled={busy}
          />
          <span className="text-sm leading-snug">
            I confirm that I have read and that I accept the iThenticate End User License Agreement
          </span>
        </label>
      </div>
    </ui.SimpleDialog>
  );
}
