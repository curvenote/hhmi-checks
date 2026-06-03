'use client';

import type { UploadCheckOptionProps } from '@curvenote/scms-core';
import { UploadCheckCardContent } from '@curvenote/scms-core';
import { Logos } from '../client.js';

export function ProofigUploadCheckOption({ enabled, setEnabled }: UploadCheckOptionProps) {
  return (
    <UploadCheckCardContent
      logo={<Logos.LogoThemed className="h-[22px] w-auto max-w-[79px]" alt="Proofig" />}
      title="Check Image Integrity"
      description="Submit your document to Proofig for analysis and integrity checking."
      infoLine="1 file only, DOCX or PDF, 50 MB maximum size"
      enabled={enabled}
      onRequestEnable={() => {
        void setEnabled(true);
      }}
    />
  );
}
