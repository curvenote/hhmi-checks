import type React from 'react';
import { Logos } from '../client.js';

export function ImageIntegritySectionHeader({ tag }: { tag: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-center w-full">
      <div className="flex gap-2 justify-between items-center w-full">
        <div className="font-normal uppercase text-muted-foreground">Figure Integrity Checks</div>
        {tag}
        <div className="grow" />
        <Logos.ProofigLogo className="self-end h-8" />
      </div>
    </div>
  );
}
