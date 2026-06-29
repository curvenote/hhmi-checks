import type { ExtensionCheckSectionSummaryTitleProps } from '@curvenote/scms-core';
import { extensionPackageTitle } from '../meta.js';
import { LogoThemed } from '../icons.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProofigSummaryTitle(_props: ExtensionCheckSectionSummaryTitleProps) {
  return <LogoThemed className="h-5 max-w-[13rem]" alt={extensionPackageTitle} />;
}
