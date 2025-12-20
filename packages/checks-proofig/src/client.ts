/**
 * Client-safe exports for the Image Integrity Checks extension.
 */

import type {
  ClientExtension,
  ExtensionCheckService,
  ExtensionIcon,
  ExtensionTask,
  NavigationRegistration,
} from '@curvenote/scms-core';
import { ImageIntegrityIcon, ProofigLogoMono, ProofigLogo } from './icons.js';
import { ImageIntegrityTaskCard } from './ImageIntegrityTaskCard.js';
import { ImageIntegrityChecksSection } from './components/ImageIntegrityChecksSection.js';

export const id = 'checks-proofig';
export const name = 'Image Integrity Checks';
export const description = 'Image integrity checking service for works';

// Temporary export of logos
export const Logos = {
  ImageIntegrityIcon,
  ProofigLogoMono,
  ProofigLogo,
};

export function getTasks(): ExtensionTask[] {
  return [
    {
      id: 'image-integrity-check',
      name: 'Run Image Integrity Checks',
      description: 'Check the integrity of images in your works.',
      component: ImageIntegrityTaskCard,
    },
  ];
}

export function getIcons(): ExtensionIcon[] {
  return [
    {
      id: 'checks-proofig',
      component: ImageIntegrityIcon,
      tags: ['default', 'light'],
    },
    {
      id: 'proofig-logo-mono',
      component: ProofigLogoMono,
      tags: ['text', 'dark'],
    },
    {
      id: 'proofig-logo',
      component: ProofigLogo,
      tags: ['text', 'light'],
    },
  ];
}

export function getChecks(): ExtensionCheckService[] {
  return [
    {
      id: 'proofig',
      name: 'Image Integrity',
      description: 'Detect potential issues with images in your work.',
      checksSectionComponent: ImageIntegrityChecksSection,
    },
  ];
}

export function registerNavigation(): NavigationRegistration[] {
  return [];
}

export const extension: ClientExtension = {
  id,
  name,
  description,
  getTasks,
  getIcons,
  getChecks,
  registerNavigation,
} as const;
