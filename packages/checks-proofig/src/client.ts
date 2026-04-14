/**
 * Client-safe exports for the Image Integrity Checks extension.
 */

import type {
  ClientExtension,
  ClientExtensionCheckService,
  ExtensionIcon,
  NavigationRegistration,
} from '@curvenote/scms-core';
import { Icon, LogoMono, Logo, LogoThemed } from './icons.js';
import { ImageIntegrityChecksSection } from './components/ImageIntegrityChecksSection.js';
import { ImageIntegritySectionHeader } from './components/ImageIntegritySectionHeader.js';
import { ProofigCheckRunTimelineMount } from './components/ProofigCheckRunTimelineMount.js';
import { ProofigSummaryBadge } from './components/ProofigSummaryBadge.js';
import ExtensionAdminCard from './admin/ExtensionAdminCard.js';

export const id = 'checks-proofig';
export const name = 'Image Integrity Checks';
export const description = 'Image integrity checking service for works';

/** App-absolute POST target for Proofig check mutations (must match `registerRoutes` mount). */
export const PROOFIG_CHECKS_ACTION_PATH = '/app/extensions/proofig/actions' as const;

export const Logos = {
  Icon,
  LogoMono,
  Logo,
  LogoThemed,
};

export function getIcons(): ExtensionIcon[] {
  return [
    {
      id: 'checks-proofig',
      component: Icon,
      tags: ['default', 'light'],
    },
    {
      id: 'proofig-logo-mono',
      component: LogoMono,
      tags: ['text', 'dark'],
    },
    {
      id: 'proofig-logo',
      component: Logo,
      tags: ['text', 'light'],
    },
  ];
}

export function getChecks(): ClientExtensionCheckService[] {
  return [
    {
      id: 'proofig',
      name: 'Image Integrity',
      description: 'Detect potential issues with images in your work.',
      checksActionPath: PROOFIG_CHECKS_ACTION_PATH,
      sectionHeaderComponent: ImageIntegritySectionHeader,
      sectionActivityComponent: ImageIntegrityChecksSection,
      sectionSummaryBadgeComponent: ProofigSummaryBadge,
      checkRunTimelineMountComponent: ProofigCheckRunTimelineMount,
    },
  ];
}

export function registerNavigation(): NavigationRegistration[] {
  return [];
}

export function getExtensionAdminCard() {
  return ExtensionAdminCard;
}

export const extension: ClientExtension = {
  id,
  name,
  description,
  getIcons,
  getChecks,
  registerNavigation,
  getExtensionAdminCard,
} as const;
