import { data } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import {
  withAppContext,
  sanitizeUserInput,
  withValidFormData,
  validateFormData,
} from '@curvenote/scms-server';
import type { NormalizedArticleRecord } from '../backend/types.js';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import { getEmailTemplates } from '../client.js';

export async function loader() {
  // This route only handles POST requests
  console.error('This route only handles POST requests');
  return data({}, { status: 405 });
}

export function shouldRevalidate() {
  // Prevent revalidation after help request submissions to avoid closing dialogs
  return false;
}

/**
 * Intent types for help requests
 */
const HelpRequestIntent = z.enum(['compliance-report-request', 'general-help', 'publication-help']);

/**
 * Base intent schema to validate the intent field (optional for backward compatibility)
 */
const IntentSchema = zfd.formData({
  intent: HelpRequestIntent.optional(),
});

/**
 * Schema for compliance report request (requires ORCID)
 */
const ComplianceReportRequestSchema = zfd.formData({
  intent: z.literal('compliance-report-request'),
  orcid: z.string().min(1, 'ORCID is required'),
  message: zfd.text(z.string().optional()),
});

/**
 * Schema for general help request
 */
const GeneralHelpRequestSchema = zfd.formData({
  intent: z.literal('general-help'),
  message: zfd.text(z.string().optional()),
  orcid: zfd.text(z.string().optional()),
});

/**
 * Handler for compliance report requests
 * Sends an email when a user has linked their ORCID but is not found in the database
 */
async function handleComplianceReportRequest(
  ctx: Awaited<ReturnType<typeof withAppContext>>,
  payload: z.infer<typeof ComplianceReportRequestSchema>,
) {
  const supportEmail = ctx.$config.app?.branding?.supportEmail;
  if (!supportEmail) {
    console.error('Support email not configured');
    return data({ success: false, error: 'Support email not configured' }, { status: 500 });
  }

  const userName = ctx.user.display_name || 'Unknown User';
  const userEmail = ctx.user.email || 'No email provided';

  // Sanitize user-provided message
  const sanitizedMessage = payload.message ? sanitizeUserInput(payload.message, 2000) : undefined;

  try {
    await ctx.sendEmail(
      {
        eventType: 'COMPLIANCE_REPORT_REQUEST',
        to: supportEmail,
        subject: 'Compliance Dashboard Requested',
        templateProps: {
          userName,
          userEmail,
          orcid: payload.orcid,
          sanitizedMessage,
        },
        ignoreUnsubscribe: true,
      },
      getEmailTemplates(),
    );

    return data({ success: true });
  } catch (error) {
    console.error('Failed to send compliance report request email:', error);
    return data({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}

/**
 * Handler for general help requests
 */
async function handleGeneralHelpRequest(
  ctx: Awaited<ReturnType<typeof withAppContext>>,
  payload: z.infer<typeof GeneralHelpRequestSchema>,
) {
  const supportEmail = ctx.$config.app?.branding?.supportEmail;
  if (!supportEmail) {
    console.error('Support email not configured');
    return data({ success: false, error: 'Support email not configured' }, { status: 500 });
  }

  const userName = ctx.user.display_name || 'Unknown User';
  const userEmail = ctx.user.email || 'No email provided';

  // Sanitize user-provided message
  const sanitizedMessage = payload.message ? sanitizeUserInput(payload.message, 2000) : undefined;

  try {
    await ctx.sendEmail(
      {
        eventType: 'COMPLIANCE_GENERAL_HELP_REQUEST',
        to: supportEmail,
        subject: 'Help Requested on Compliance',
        templateProps: {
          userName,
          userEmail,
          orcid: payload.orcid,
          sanitizedMessage,
        },
        ignoreUnsubscribe: true,
      },
      getEmailTemplates(),
    );

    return data({ success: true });
  } catch (error) {
    console.error('Failed to send help request email:', error);
    return data({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}

/**
 * Handler for publication-specific help requests (legacy format)
 */
async function handlePublicationHelpRequest(
  ctx: Awaited<ReturnType<typeof withAppContext>>,
  rawMessage: string,
  orcid: string,
  publication?: NormalizedArticleRecord,
) {
  const supportEmail = ctx.$config.app?.branding?.supportEmail;
  if (!supportEmail) {
    console.error('Support email not configured');
    return data({ success: false, error: 'Support email not configured' }, { status: 500 });
  }

  const userName = ctx.user.display_name || 'Unknown User';
  const userEmail = ctx.user.email || 'No email provided';

  // Sanitize and validate message
  const message = sanitizeUserInput(rawMessage, 2000);
  if (!message.trim()) {
    return data({ success: false, error: 'Message cannot be empty' }, { status: 400 });
  }

  try {
    await ctx.sendEmail(
      {
        eventType: 'COMPLIANCE_PUBLICATION_HELP_REQUEST',
        to: supportEmail,
        subject: 'Help Requested on Compliance for a Publication',
        templateProps: {
          userName,
          userEmail,
          message,
          publication,
          orcid,
        },
        ignoreUnsubscribe: true,
      },
      getEmailTemplates(),
    );

    return data({ success: true });
  } catch (error) {
    console.error('Failed to send help request email:', error);
    return data({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}

/**
 * Action handler for HHMI compliance help requests
 * Supports both intent-based routing (new) and legacy publication-specific requests
 */
export async function action(args: ActionFunctionArgs) {
  const ctx = await withAppContext(args);

  const formData = await args.request.formData();
  const intent = formData.get('intent') as string | null;

  // If intent is provided, use intent-based routing
  if (intent) {
    try {
      const intentData = validateFormData(IntentSchema, formData);
      const validatedIntent = intentData.intent;

      if (validatedIntent === 'compliance-report-request') {
        return withValidFormData(ComplianceReportRequestSchema, formData, async (payload) => {
          return handleComplianceReportRequest(ctx, payload);
        });
      } else if (validatedIntent === 'general-help') {
        return withValidFormData(GeneralHelpRequestSchema, formData, async (payload) => {
          return handleGeneralHelpRequest(ctx, payload);
        });
      }
    } catch (error: any) {
      return data({ success: false, error: error.message ?? 'Invalid intent' }, { status: 400 });
    }
  }

  // Legacy format: publication-specific help requests
  const rawMessage = formData.get('message') as string;
  const publicationDataJson = formData.get('publicationData') as string | null;
  const orcid = formData.get('orcid') as string;

  if (!rawMessage || !orcid) {
    return data({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  // Reconstruct publication object from formData if provided
  let publication: NormalizedArticleRecord | undefined;
  if (publicationDataJson) {
    try {
      const pubData = JSON.parse(publicationDataJson);
      publication = {
        id: pubData.id,
        title: pubData.title?.trim() || undefined,
        compliant: pubData.compliant || false,
        everNonCompliant: pubData.everNonCompliant || false,
        dateResolved: pubData.dateResolved?.trim() || undefined,
        pmid: pubData.pmid?.trim() || undefined,
        pmcid: pubData.pmcid?.trim() || undefined,
        journal:
          pubData.journal?.doi ||
          pubData.journal?.complianceIssueType ||
          pubData.journal?.complianceIssueStatus
            ? {
                doi: pubData.journal.doi?.trim() || undefined,
                complianceIssueType: pubData.journal.complianceIssueType?.trim() || undefined,
                complianceIssueStatus: pubData.journal.complianceIssueStatus?.trim() || undefined,
              }
            : undefined,
        preprint:
          pubData.preprint?.doi ||
          pubData.preprint?.complianceIssueType ||
          pubData.preprint?.complianceIssueStatus
            ? {
                doi: pubData.preprint.doi?.trim() || undefined,
                complianceIssueType: pubData.preprint.complianceIssueType?.trim() || undefined,
                complianceIssueStatus: pubData.preprint.complianceIssueStatus?.trim() || undefined,
              }
            : undefined,
      } as NormalizedArticleRecord;
    } catch (error) {
      console.error('Failed to parse publication data:', error);
      return data({ success: false, error: 'Invalid publication data' }, { status: 400 });
    }
  }

  return handlePublicationHelpRequest(ctx, rawMessage, orcid, publication);
}
