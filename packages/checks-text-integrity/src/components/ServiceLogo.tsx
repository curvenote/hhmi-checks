import { useEffect, useRef, useState } from 'react';
import { cn } from '@curvenote/scms-core';

/**
 * Renders the service manifest logo when available, falling back to the
 * manifest title text if the image fails to load, then to a generic icon.
 *
 * Handles the SSR case where the image error fires before React hydration
 * by checking the native image state on mount.
 */
export function ServiceLogo({
  manifestLogoUrl,
  manifestTitle,
  className,
}: {
  manifestLogoUrl?: string;
  manifestTitle?: string;
  className?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgFailed(true);
    }
  }, []);

  if (manifestLogoUrl && !imgFailed) {
    return (
      <img
        ref={imgRef}
        src={manifestLogoUrl}
        alt={manifestTitle ?? 'Service logo'}
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <span className={cn(className, 'h-auto')}>{manifestTitle ?? 'Text Integrity'}</span>;
}
