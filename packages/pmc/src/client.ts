/**
 * Client-safe exports for the PMC Submission extension.
 */

import type {
  ClientExtension,
  ExtensionAnalyticsEvents,
  ExtensionIcon,
  ExtensionTask,
  WorkflowRegistration,
} from '@curvenote/scms-core';
import { registerNavigation } from './navigation.js';
import { ComplianceWizardTaskCard } from './ComplianceWizardTaskCard.js';
import { PMCDepositTaskCard } from './DepositTaskCard.js';
import { PMCIcon } from './Icon.js';
import { PMCTrackEvent, PMCTrackEventDescriptions } from './analytics/events.js';
import { workflows } from './workflows.js';

export const id = 'pmc';
export const name = 'PMC Submission';
export const description = 'Submit to PubMed Central';

export function getTasks(): ExtensionTask[] {
  return [
    {
      id: 'pmc-compliance',
      name: 'Get Help with Open Access Policy Compliance',
      description: 'Answer questions to understand your compliance requirements',
      component: ComplianceWizardTaskCard,
    },
    {
      id: 'pmc-deposit',
      name: 'PMC Deposit',
      description: 'Submit to PubMed Central',
      component: PMCDepositTaskCard,
    },
  ];
}

export function getIcons(): ExtensionIcon[] {
  return [
    {
      id: 'pmc',
      component: PMCIcon,
      tags: ['default', 'light'],
    },
  ];
}

export function getAnalyticsEvents(): ExtensionAnalyticsEvents {
  return {
    events: PMCTrackEvent,
    descriptions: PMCTrackEventDescriptions,
  };
}

export function getWorkflows(): WorkflowRegistration {
  return { workflows };
}

export const extension: ClientExtension = {
  id,
  name,
  description,
  getTasks,
  getIcons,
  getAnalyticsEvents,
  getWorkflows,
  registerNavigation,
};
