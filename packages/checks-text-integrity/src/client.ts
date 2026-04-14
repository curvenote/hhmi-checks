/**
 * Client-safe exports for the Text Integrity Checks extension.
 */

import type {
  ClientExtension,
  ClientExtensionCheckService,
  ExtensionIcon,
  NavigationRegistration,
} from '@curvenote/scms-core';
import { TextIntegrityIcon, TextIntegrityLogo, TextIntegrityLogoMono } from './icons.js';
import { TextIntegrityChecksSection } from './components/TextIntegrityChecksSection.js';
import { TextIntegritySectionHeader } from './components/TextIntegritySectionHeader.js';
import { TextIntegritySummaryBadge } from './components/TextIntegritySummaryBadge.js';
import { TextIntegritySummaryTitle } from './components/TextIntegritySummaryTitle.js';
import ExtensionAdminCard from './admin/ExtensionAdminCard.js';
import { extensionPackageTitle } from './meta.js';

export const id = 'checks-text-integrity';
export const name = extensionPackageTitle;
export const description = 'Text integrity checking service for works';

/** App-absolute POST target for Text Integrity check mutations (must match `registerRoutes` mount). */
export const TEXT_INTEGRITY_CHECKS_ACTION_PATH =
  '/app/extensions/checks-text-integrity/actions' as const;

export const Logos = {
  TextIntegrityIcon,
  TextIntegrityLogo,
  TextIntegrityLogoMono,
};

export function getIcons(): ExtensionIcon[] {
  return [
    {
      id: 'checks-text-integrity',
      component: TextIntegrityIcon,
      tags: ['default', 'light'],
    },
    {
      id: 'checks-text-integrity-logo',
      component: TextIntegrityLogo,
      tags: ['text', 'light'],
    },
    {
      id: 'checks-text-integrity-logo-mono',
      component: TextIntegrityLogoMono,
      tags: ['text', 'dark'],
    },
  ];
}

export function getChecks(): ClientExtensionCheckService[] {
  return [
    {
      id: 'checks-text-integrity',
      name: 'Text Integrity',
      description: 'Verify text integrity in your work.',
      checksActionPath: TEXT_INTEGRITY_CHECKS_ACTION_PATH,
      sectionHeaderComponent: TextIntegritySectionHeader,
      sectionActivityComponent: TextIntegrityChecksSection,
      sectionSummaryBadgeComponent: TextIntegritySummaryBadge,
      sectionSummaryTitleComponent: TextIntegritySummaryTitle,
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
