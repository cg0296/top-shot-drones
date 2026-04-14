import { db } from '@/lib/db';
import type { Role } from '@prisma/client';

export interface UserMembership {
  organizationId: string;
  role: Role;
  isDefault: boolean;
  organization: { id: string; name: string; slug: string };
}

/**
 * Get all orgs the user is a member of, with their role in each.
 */
export async function getUserMemberships(userId: string): Promise<UserMembership[]> {
  const memberships = await db.organizationMembership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
  });
  return memberships.map((m) => ({
    organizationId: m.organizationId,
    role: m.role,
    isDefault: m.isDefault,
    organization: {
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
    },
  }));
}

/**
 * Return the set of org IDs a user can access content for.
 * Platform ADMINs get an empty set + a flag — callers should check `isPlatformAdmin` first.
 */
export async function getAccessibleOrgIds(userId: string): Promise<string[]> {
  const rows = await db.organizationMembership.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  return rows.map((r) => r.organizationId);
}

/**
 * Check whether the user has a given role (or higher) in the given org.
 * Role ordering: ADMIN > STAFF > CUSTOMER > VIEWER.
 */
const ROLE_RANK: Record<Role, number> = {
  ADMIN: 4,
  STAFF: 3,
  CUSTOMER: 2,
  VIEWER: 1,
};

export async function hasOrgRole(
  userId: string,
  organizationId: string,
  minimum: Role,
): Promise<boolean> {
  const m = await db.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!m) return false;
  return ROLE_RANK[m.role] >= ROLE_RANK[minimum];
}
