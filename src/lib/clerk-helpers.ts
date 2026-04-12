import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * Get or create a database user from the current Clerk session.
 * On first sign-in, creates a User row linked to the Clerk user ID.
 * Returns the full database user with organization relation.
 */
export async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User';

  // Look up by email first (handles existing seeded users)
  let dbUser = await db.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (dbUser) {
    return dbUser;
  }

  // Create a new user — default to CUSTOMER role, no org
  dbUser = await db.user.create({
    data: {
      name,
      email,
      passwordHash: 'clerk-managed',
      role: 'CUSTOMER',
    },
    include: { organization: true },
  });

  return dbUser;
}
