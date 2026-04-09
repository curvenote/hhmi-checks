import { TextIntegrityLogo } from '../icons.js';

/**
 * Renders the service manifest logo when available, falling back to a Lucide FileText icon.
 */
export function ServiceLogo({
  manifestLogoUrl,
  className,
}: {
  manifestLogoUrl?: string;
  className?: string;
}) {
  if (manifestLogoUrl) {
    return <img src={manifestLogoUrl} alt="Service logo" className={className} />;
  }
  return <TextIntegrityLogo className={className} />;
}
