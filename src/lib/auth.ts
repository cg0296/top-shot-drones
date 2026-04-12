import { randomBytes, createHash } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { db } from '@/lib/db';
import type { Session, User } from '@prisma/client';

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 30;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return compare(plain, hash);
}

export async function createSession(
  userId: string,
): Promise<{ token: string; session: Session }> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, session };
}

export async function getSessionUser(token: string): Promise<User | null> {
  const tokenHash = hashToken(token);

  const session = await db.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          organization: true,
        },
      },
    },
  });

  return session?.user ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  await db.session.deleteMany({
    where: { tokenHash },
  });
}
