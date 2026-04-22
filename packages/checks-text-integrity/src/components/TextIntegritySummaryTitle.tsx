import type { ExtensionCheckSectionSummaryTitleProps } from '@curvenote/scms-core';
import { ServiceLogo } from '@curvenote/scms-core';
import { extensionPackageTitle } from '../meta.js';
import { getTextIntegrityManifest } from '../schema.js';

export function TextIntegritySummaryTitle({ metadata }: ExtensionCheckSectionSummaryTitleProps) {
  const manifest = getTextIntegrityManifest(metadata);
  const logoAlt = manifest?.title ?? extensionPackageTitle;
  const className = 'h-3 max-w-[9rem] object-contain object-left';

  return (
    <ServiceLogo logoUrl={manifest?.logo} alt={logoAlt} fallback={logoAlt} className={className} />
  );
}
