import { data as dataResponse } from 'react-router';
import type { SecureContext } from '@curvenote/scms-server';
import { getPrismaClient } from '@curvenote/scms-server';
import { HHMITrackEvent } from '../analytics/events.js';
import type { ComplianceUserMetadata } from './types.js';

/**
 * Update user's compliance metadata in the database
 */
export async function updateUserComplianceMetadata(
  userId: string,
  metadata: Partial<ComplianceUserMetadata>,
): Promise<void> {
  if (!metadata || Object.keys(metadata).length === 0) {
    return;
  }

  try {
    const prisma = await getPrismaClient();

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { data: true },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    const currentData = (user.data as any) || {};
    const updatedData = {
      ...currentData,
      compliance: {
        ...currentData.compliance,
        ...metadata,
      },
    };

    await prisma.user.update({
      where: { id: userId },
      data: { data: updatedData },
    });
  } catch (error) {
    console.error(`Failed to update user compliance metadata for user ${userId}:`, error);
    // Don't throw - this is a background update, shouldn't break the loader
  }
}

/**
 * Handle hiding the user's compliance report
 */
export async function handleMyHideReport(ctx: SecureContext) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const prisma = await getPrismaClient();

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { data: true },
    });

    if (!user) {
      return dataResponse({ error: 'User not found' }, { status: 404 });
    }

    // Update user data to hide compliance report
    const currentData = (user.data as any) || {};
    const updatedData = {
      ...currentData,
      compliance: {
        ...currentData.compliance,
        hideMyReport: true,
      },
    };

    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { data: updatedData },
    });

    await ctx.trackEvent(HHMITrackEvent.HHMI_COMPLIANCE_REPORT_HIDDEN, {});

    return { success: true };
  } catch (error) {
    console.error('Failed to hide compliance report:', error);
    return dataResponse(
      {
        error: {
          type: 'general',
          message: error instanceof Error ? error.message : 'Failed to hide report',
        },
      },
      { status: 500 },
    );
  }
}
