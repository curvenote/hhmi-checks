import { FileCheck } from 'lucide-react';
import proofigLogoMono from './assets/proofig-logo-mono.svg';
import proofigLogo from './assets/proofig-logo.svg';

export function ImageIntegrityIcon({ className }: { className?: string }) {
  return <FileCheck className={className} />;
}

export function ProofigLogoMono({ className }: { className?: string }) {
  return <img src={proofigLogoMono} alt="Proofig Logo Mono" className={className} />;
}

export function ProofigLogo({ className }: { className?: string }) {
  return <img src={proofigLogo} alt="Proofig Logo" className={className} />;
}
