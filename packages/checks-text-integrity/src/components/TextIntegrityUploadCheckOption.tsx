'use client';

import type { UploadCheckOptionProps } from '@curvenote/scms-core';
import { ServiceLogo, UploadCheckCardContent } from '@curvenote/scms-core';
import { TextIntegrityEulaDialog } from './TextIntegrityEulaDialog.js';
import { useTextIntegrityEulaEnable } from './useTextIntegrityEulaEnable.js';
import { Logos } from '../client.js';

export function TextIntegrityUploadCheckOption({
  workVersionId,
  enabled,
  setEnabled,
  logoUrl,
}: UploadCheckOptionProps) {
  const { dialogOpen, setDialogOpen, eulaPresentation, requestEnable, acceptEula, busy } =
    useTextIntegrityEulaEnable(workVersionId);

  return (
    <>
      <UploadCheckCardContent
        logo={
          <ServiceLogo
            logoUrl={logoUrl}
            alt="Text Integrity"
            fallback={<Logos.TextIntegrityLogo className="h-[22px] w-auto max-w-[79px]" />}
            className="h-[22px] w-auto max-w-[79px] object-contain"
          />
        }
        title="Check Text Integrity"
        description="Verify text in your work with similarity checking."
        infoLine="Multiple files allowed, DOCX or PDF, 100 MB maximum total size"
        enabled={enabled}
        busy={busy || dialogOpen}
        spinnerWhenBusy
        onRequestEnable={() => {
          requestEnable(() => {
            void setEnabled(true);
          });
        }}
      />
      {eulaPresentation ? (
        <TextIntegrityEulaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          logoUrl={logoUrl}
          html={eulaPresentation.html}
          url={eulaPresentation.url}
          version={eulaPresentation.version}
          busy={busy}
          onAccept={acceptEula}
        />
      ) : null}
    </>
  );
}
