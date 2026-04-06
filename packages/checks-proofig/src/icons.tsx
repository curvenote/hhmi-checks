import { FileCheck } from 'lucide-react';
import proofigLogoMono from './assets/proofig-logo-mono.svg';
import proofigLogo from './assets/proofig-logo.svg';

export function Icon({ className }: { className?: string }) {
  return <FileCheck className={className} />;
}

export function LogoMono({ className }: { className?: string }) {
  return <img src={proofigLogoMono} alt="Proofig Logo Mono" className={className} />;
}

export function Logo({ className }: { className?: string }) {
  return <img src={proofigLogo} alt="Proofig Logo" className={className} />;
}

export function LogoThemed({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center shrink-0 ${className}`}>
      <Logo className="w-auto h-full dark:hidden" />
      <LogoMono className="hidden w-auto h-full dark:block" />
    </span>
  );
}
