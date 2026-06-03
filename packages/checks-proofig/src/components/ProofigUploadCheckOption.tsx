'use client';

import type { UploadCheckOptionProps } from '@curvenote/scms-core';
import { UploadCheckCardContent } from '@curvenote/scms-core';
import { Logos } from '../client.js';

export function ProofigUploadCheckOption({
  enabled,
  disabled,
  invalid,
  setEnabled,
  toggleBusy = false,
}: UploadCheckOptionProps) {
  return (
    <UploadCheckCardContent
      logo={<Logos.LogoThemed className="h-[22px] w-auto max-w-[79px]" alt="Proofig" />}
      title="Check Image Integrity"
      description="Submit your document to Proofig for analysis and integrity checking."
      infoLine="1 file only, DOCX or PDF, 50 MB maximum size"
      enabled={enabled}
      disabled={disabled}
      invalid={invalid}
      busy={toggleBusy}
      spinnerWhenBusy
      onRequestEnable={() => {
        void setEnabled(true);
      }}
    />
  );
}
