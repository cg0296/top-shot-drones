import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * Get or create a database user from the current Clerk session.
 * Returns the user with their organization memberships loaded.
 */
export async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User';

  let dbUser = await db.user.findUnique({
    where: { email },
    include: {
      memberships: { include: { organization: true } },
    },
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
    include: {
      memberships: { include: { organization: true } },
    },
  });

  return dbUser;
}
