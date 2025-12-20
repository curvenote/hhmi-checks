import { getPrismaClient, createAccess, revokeAccess } from '@curvenote/scms-server';
import type { Access, Prisma } from '@prisma/client';
import type { AccessGrants } from '@curvenote/scms-server';
import { hhmi } from './scopes.js';

// Type for the Access query with owner and linkedAccounts included
type AccessWithOwner = Prisma.AccessGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
        display_name: true;
        email: true;
        linkedAccounts: {
          where: {
            provider: 'orcid';
            pending: false;
          };
          select: {
            idAtProvider: true;
          };
        };
      };
    };
  };
}>;

// Return type for shared compliance reports
export type ComplianceReportSharedWith = {
  accessId: string;
  user: AccessWithOwner['owner'];
  orcid: string | undefined;
  dateGranted: AccessWithOwner['date_created'];
};

/**
 * Get users who have shared their compliance dashboards with the given user
 */
export async function getComplianceReportsSharedWith(
  receiverId: string,
): Promise<ComplianceReportSharedWith[]> {
  const prisma = await getPrismaClient();
  const accessGrants = await prisma.access.findMany({
    where: {
      receiver_id: receiverId,
      type: 'user',
      active: true,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          email: true,
          linkedAccounts: {
            where: {
              provider: 'orcid',
              pending: false,
            },
            select: {
              idAtProvider: true,
            },
          },
        },
      },
    },
  });

  // Filter for compliance read access only
  return accessGrants
    .filter((access: AccessWithOwner) => {
      const grants = access.grants as unknown as AccessGrants;
      return grants.scopes?.includes(hhmi.compliance.read) || false;
    })
    .map((access: AccessWithOwner) => ({
      accessId: access.id,
      user: access.owner,
      orcid: access.owner.linkedAccounts[0]?.idAtProvider ?? undefined,
      dateGranted: access.date_created,
    }));
}

/**
 * Grant compliance report access to another user
 */
export async function createAccessWithComplianceReadScope(
  ownerId: string,
  recipientUserId: string,
): Promise<Access> {
  return createAccess({
    type: 'user',
    grants: {
      scopes: [hhmi.compliance.read],
    },
    ownerId: ownerId,
    receiverId: recipientUserId,
  });
}

// Type for the Access query with receiver included
type AccessWithReceiver = Prisma.AccessGetPayload<{
  include: {
    receiver: {
      select: {
        id: true;
        username: true;
        display_name: true;
        email: true;
      };
    };
  };
}>;

/**
 * Get all access records granted by a specific user for compliance dashboards
 * Sorted by date_modified descending (most recent first)
 */
export async function getComplianceAccessGrantedBy(userId: string): Promise<AccessWithReceiver[]> {
  const prisma = await getPrismaClient();
  const accessGrants = await prisma.access.findMany({
    where: {
      owner_id: userId,
      active: true,
      type: 'user',
    },
    include: {
      receiver: {
        select: {
          id: true,
          username: true,
          display_name: true,
          email: true,
        },
      },
    },
    orderBy: {
      date_modified: 'desc',
    },
  });

  // Filter for compliance read access only
  return accessGrants.filter((access: AccessWithReceiver) => {
    const grants = access.grants as unknown as AccessGrants;
    return grants.scopes?.includes(hhmi.compliance.read) || false;
  });
}

/**
 * Revoke compliance report access
 * @param accessId - The access record ID to revoke
 * @param performedByUserId - Optional user ID who performed the revocation (for admin actions)
 */
export async function revokeComplianceAccess(
  accessId: string,
  performedByUserId?: string,
): Promise<Access> {
  return revokeAccess(accessId, performedByUserId);
}
