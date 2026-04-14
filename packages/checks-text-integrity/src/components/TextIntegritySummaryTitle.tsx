import type { ExtensionCheckSectionSummaryTitleProps } from '@curvenote/scms-core';
import { extensionPackageTitle } from '../meta.js';
import { ServiceLogo } from './ServiceLogo.js';
import { getTextIntegrityManifest } from '../schema.js';

export function TextIntegritySummaryTitle({ metadata }: ExtensionCheckSectionSummaryTitleProps) {
  const manifest = getTextIntegrityManifest(metadata);
  const logoAlt = manifest?.title ?? extensionPackageTitle;
  const className = 'h-3 max-w-[9rem] object-contain object-left';

  return (
    <ServiceLogo manifestLogoUrl={manifest?.logo} manifestTitle={logoAlt} className={className} />
  );
}
