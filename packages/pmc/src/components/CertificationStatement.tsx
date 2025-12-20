import { Check } from 'lucide-react';

export function CertificationStatement() {
  return (
    <div className="flex items-start gap-2" aria-label="Certification statement">
      <Check className="text-green-600 stroke-3 mt-[1px]" aria-label="Certified" />
      <span className="text-base">
        I certify that this manuscript submission includes all referenced figures, tables, videos,
        and supplementary material.
      </span>
    </div>
  );
}
