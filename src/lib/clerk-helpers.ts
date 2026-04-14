import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export const IMPERSONATION_COOKIE = 'impersonate-user-id';

/**
 * Get or create the actual Clerk-backed user, ignoring any impersonation.
 * Use for endpoints that check real admin identity (e.g. start/stop impersonation).
 */
export async function getRealUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User';

  let dbUser = await db.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true } } },
  });

  if (dbUser) return dbUser;

  const adminEmails = ['wparker@topshotdrones.net'];
  const role = adminEmails.includes(email.toLowerCase()) ? 'ADMIN' : 'CUSTOMER';

  dbUser = await db.user.create({
    data: {
      name,
      email,
      passwordHash: 'clerk-managed',
      role,
    },
    include: { memberships: { include: { organization: true } } },
  });

  return dbUser;
}

/**
 * Get the "effective" user for the current request. If the real user is an ADMIN
 * and has the impersonation cookie set, returns the impersonated user instead.
 * Otherwise returns the real user.
 */
export async function getOrCreateDbUser() {
  const realUser = await getRealUser();
  if (!realUser) return null;

  const cookieStore = await cookies();
  const impersonateId = cookieStore.get(IMPERSONATION_COOKIE)?.value;

  if (impersonateId && realUser.role === 'ADMIN' && impersonateId !== realUser.id) {
    const target = await db.user.findUnique({
      where: { id: impersonateId },
      include: { memberships: { include: { organization: true } } },
    });
    if (target) return target;
  }

  return realUser;
}

/**
 * Returns the real user AND the effective (possibly impersonated) user in one call.
 * Useful for the layout/banner.
 */
export async function getAuthContext() {
  const realUser = await getRealUser();
  const effectiveUser = await getOrCreateDbUser();
  const impersonating =
    realUser && effectiveUser && realUser.id !== effectiveUser.id ? effectiveUser : null;
  return { realUser, effectiveUser, impersonating };
}
