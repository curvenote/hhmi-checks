import { data as dataResponse } from 'react-router';
import type { SecureContext } from '@curvenote/scms-server';
import {
  getComplianceAccessGrantedBy,
  createAccessWithComplianceReadScope,
} from '../../backend/access.server.js';
import { getPrismaClient } from '@curvenote/scms-server';
import { HHMITrackEvent } from '../../analytics/events.js';
import type { Config } from '@/types/app-config.js';
import { getEmailTemplates } from '../../client.js';

/**
 * A very specific handler that should be invoked by a user to share their
 * own compliance report only with another user.
 */
export async function handleShareMyComplianceReport(ctx: SecureContext, recipientUserId: string) {
  if (!recipientUserId) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'Please select a user',
        },
      },
      { status: 400 },
    );
  }

  // Security check: Verify user has an ORCID account (required for compliance dashboards)
  const orcidAccount = ctx.user.linkedAccounts.find(
    (account) => account.provider === 'orcid' && !account.pending,
  );

  if (!orcidAccount) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'You must have a linked ORCID account to share your compliance report',
        },
      },
      { status: 403 },
    );
  }

  // Security check: Verify ORCID account has a valid ID
  if (!orcidAccount.idAtProvider) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'Your ORCID account is missing an ID. Please re-link your ORCID account.',
        },
      },
      { status: 403 },
    );
  }

  // Security check: Verify user hasn't hidden their report
  const userData = (ctx.user.data as any) || {};
  const hideMyReport = userData.compliance?.hideMyReport === true;

  if (hideMyReport) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'You cannot provide access to your dashboard because you have hidden it',
        },
      },
      { status: 403 },
    );
  }

  // Security check: Prevent sharing with yourself
  if (recipientUserId === ctx.user.id) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'You cannot provide access to yourself',
        },
      },
      { status: 400 },
    );
  }

  // Get recipient user information
  const prisma = await getPrismaClient();
  const recipient = await prisma.user.findUnique({
    where: { id: recipientUserId },
    select: {
      id: true,
      email: true,
      display_name: true,
      username: true,
    },
  });

  if (!recipient) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'Recipient user not found',
        },
      },
      { status: 404 },
    );
  }

  try {
    // Check if already shared
    const existingAccess = await getComplianceAccessGrantedBy(ctx.user.id);
    const alreadyShared = existingAccess.some((access) => access.receiver_id === recipient.id);

    if (alreadyShared) {
      return dataResponse(
        {
          error: {
            type: 'validation',
            message: 'Access already granted to this user',
          },
        },
        { status: 400 },
      );
    }

    const scientistName = ctx.user.display_name || ctx.user.username;

    // Share the report - explicitly use ctx.user.id to ensure we're sharing the current user's report
    await createAccessWithComplianceReadScope(ctx.user.id, recipient.id);

    await ctx.trackEvent(HHMITrackEvent.HHMI_COMPLIANCE_REPORT_SHARED, {
      admin: false,
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      recipientDisplayName: recipient.display_name || recipient.username,
      scientistOrcid: orcidAccount?.idAtProvider,
    });

    // Send email notification
    if (recipient.email) {
      const reportUrl = ctx.asBaseUrl(
        `/app/compliance/shared/reports/${orcidAccount.idAtProvider}`,
      );

      await ctx.sendEmail(
        {
          eventType: 'COMPLIANCE_REPORT_INVITATION',
          to: recipient.email,
          subject: `You've been granted access to view ${scientistName}'s compliance dashboard`,
          templateProps: {
            scientistName,
            reportUrl,
            inviterName: ctx.user.display_name || ctx.user.username || undefined,
            inviterEmail: ctx.user.email || undefined,
            recipientName: recipient.display_name || recipient.username || undefined,
          },
        },
        getEmailTemplates(),
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to grant access to compliance dashboard:', error);
    return dataResponse(
      {
        error: {
          type: 'general',
          message: error instanceof Error ? error.message : 'Failed to grant access',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Handler for inviting a new user to the workspace via email
 * Checks if the email is already registered and sends an invitation email if not
 */
export async function handleInviteNewUser(
  ctx: SecureContext,
  email: string,
  message?: string,
  orcid?: string,
) {
  if (!email || !email.trim()) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'Email address is required',
        },
      },
      { status: 400 },
    );
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return dataResponse(
      {
        error: {
          type: 'validation',
          message: 'Please enter a valid email address',
        },
      },
      { status: 400 },
    );
  }

  try {
    // Check if user already exists with this email
    const prisma = await getPrismaClient();
    const existingUser = await prisma.user.findFirst({
      where: { email: trimmedEmail },
      select: { id: true, email: true },
    });

    if (existingUser) {
      return dataResponse(
        {
          error: {
            type: 'validation',
            message: 'User is already registered. Please use the search form to share with them.',
          },
        },
        { status: 400 },
      );
    }

    // Get platform name from config
    const config = ctx.$config as Config;
    const platformName = config.app?.branding?.title || config.name || 'the workspace';

    // Build signup URL (use base URL + /signup or configured signup URL)
    const signupUrl = ctx.asBaseUrl('/signup');

    // Send invitation email
    await ctx.sendEmail(
      {
        eventType: 'WORKSPACE_INVITATION',
        to: trimmedEmail,
        subject: `You've been invited to join ${platformName}`,
        templateProps: {
          recipientEmail: trimmedEmail,
          inviterName: ctx.user.display_name || ctx.user.username || undefined,
          inviterEmail: ctx.user.email || undefined,
          platformName,
          signupUrl,
          personalMessage: message?.trim() || undefined,
        },
      },
      getEmailTemplates(),
    );

    // Track the invitation
    await ctx.trackEvent(HHMITrackEvent.HHMI_COMPLIANCE_REPORT_SHARED, {
      admin: false,
      action: 'workspace-invitation',
      recipientEmail: trimmedEmail,
      inviterUserId: ctx.user.id,
      inviterEmail: ctx.user.email,
      orcid: orcid || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send workspace invitation:', error);
    return dataResponse(
      {
        error: {
          type: 'general',
          message: error instanceof Error ? error.message : 'Failed to send invitation',
        },
      },
      { status: 500 },
    );
  }
}
