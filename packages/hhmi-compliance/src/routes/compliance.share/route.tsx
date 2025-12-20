import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { data } from 'react-router';
import { PageFrame, SectionWithHeading } from '@curvenote/scms-core';
import { withAppContext, getPrismaClient } from '@curvenote/scms-server';
import { User } from 'lucide-react';
import {
  getComplianceAccessGrantedBy,
  revokeComplianceAccess,
} from '../../backend/access.server.js';
import { handleShareMyComplianceReport, handleInviteNewUser } from './actionHelpers.server.js';
import { ShareReportForm } from '../../components/ShareReportForm.js';
import { AccessGrantItem } from '../../components/AccessGrantItem.js';
import { hhmi } from '../../backend/scopes.js';
import type { AccessGrants } from '@curvenote/scms-server';
import { HHMITrackEvent } from '../../analytics/events.js';

interface LoaderData {
  accessGrants: Awaited<ReturnType<typeof getComplianceAccessGrantedBy>>;
}

export const meta = () => {
  return [
    { title: 'Delegate Access - Compliance Dashboard' },
    { name: 'description', content: 'Manage who can access your compliance dashboard' },
  ];
};

export async function loader(args: LoaderFunctionArgs): Promise<LoaderData> {
  const ctx = await withAppContext(args);
  const accessGrants = await getComplianceAccessGrantedBy(ctx.user.id);
  return { accessGrants };
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await withAppContext(args);

  const formData = await args.request.formData();
  const intent = formData.get('intent') as string;

  switch (intent) {
    case 'share': {
      const recipientUserId = formData.get('recipientUserId') as string;
      return handleShareMyComplianceReport(ctx, recipientUserId);
    }

    case 'invite-new-user': {
      const email = formData.get('email') as string;
      const message = formData.get('message') as string | undefined;
      const orcid = formData.get('orcid') as string | undefined;
      return handleInviteNewUser(ctx, email, message, orcid);
    }

    case 'revoke': {
      const accessId = formData.get('accessId') as string;
      if (!accessId) {
        return data(
          {
            error: {
              type: 'validation',
              message: 'Access ID is required',
            },
          },
          { status: 400 },
        );
      }
      const prisma = await getPrismaClient();
      const access = await prisma.access.findUnique({
        where: { id: accessId },
      });
      if (!access) {
        return data(
          { error: { type: 'validation', message: 'Access not found' } },
          { status: 404 },
        );
      }

      // Security check: Verify user owns this access grant
      if (access.owner_id !== ctx.user.id) {
        return data(
          {
            error: { type: 'validation', message: 'You are not authorized to revoke this access' },
          },
          { status: 403 },
        );
      }

      // Security check: Verify this is a compliance report access (not other types of access)
      const grants = access.grants as unknown as AccessGrants;
      const isComplianceAccess = grants.scopes?.includes(hhmi.compliance.read) || false;
      if (!isComplianceAccess) {
        return data(
          {
            error: {
              type: 'validation',
              message: 'This access record is not a compliance dashboard access',
            },
          },
          { status: 400 },
        );
      }
      try {
        // Get receiver information for analytics before revoking
        const receiver = access.receiver_id
          ? await prisma.user.findUnique({
              where: { id: access.receiver_id },
              select: { id: true, email: true, display_name: true, username: true },
            })
          : null;

        await revokeComplianceAccess(accessId);

        await ctx.trackEvent(HHMITrackEvent.HHMI_COMPLIANCE_REPORT_ACCESS_REVOKED, {
          admin: false,
          accessId,
          receiverUserId: access.receiver_id,
          receiverEmail: receiver?.email,
          receiverDisplayName: receiver?.display_name || receiver?.username,
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to revoke compliance access:', error);
        return data(
          {
            error: {
              type: 'general',
              message: error instanceof Error ? error.message : 'Failed to revoke access',
            },
          },
          { status: 500 },
        );
      }
    }

    default:
      return data(
        {
          error: {
            type: 'validation',
            message: 'Invalid action',
          },
        },
        { status: 400 },
      );
  }
}

export default function ComplianceAccessPage({ loaderData }: { loaderData: LoaderData }) {
  const { accessGrants } = loaderData;

  const breadcrumbs = [
    { label: 'Compliance', href: '/app/compliance' },
    { label: 'Delegate Access', isCurrentPage: true },
  ];

  return (
    <PageFrame
      title="Delegate Access"
      subtitle="Manage who can access your compliance dashboard"
      className="mx-auto max-w-screen-lg"
      breadcrumbs={breadcrumbs}
    >
      {/* Add new user form */}
      <ShareReportForm />

      {/* Current access list */}
      <SectionWithHeading heading="People with access" icon={User}>
        {accessGrants.length === 0 ? (
          <div className="overflow-hidden p-8 text-center rounded-sm border bg-background text-muted-foreground">
            <p>No one has access to your dashboard yet.</p>
            <p className="text-sm">
              Use the form above to share your dashboard with other workspace users.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accessGrants.map((grant: any) => (
              <AccessGrantItem key={grant.id} grant={grant} />
            ))}
          </div>
        )}
      </SectionWithHeading>
    </PageFrame>
  );
}
