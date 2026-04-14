import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER', 'VIEWER']),
  organizationId: z.string().min(1),
  videoIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, role, organizationId, videoIds } = parsed.data;

  // Check if user already exists
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: 'A user with this email already exists' },
      { status: 409 },
    );
  }

  // Send Clerk invitation
  try {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role,
        organizationId,
        videoIds: videoIds ?? [],
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send invitation';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Pre-create the user and their team membership so role/org/access are ready when they sign up
  const newUser = await db.user.create({
    data: {
      name: email.split('@')[0],
      email,
      passwordHash: 'clerk-managed',
      role,
      memberships: {
        create: {
          organizationId,
          role,
          isDefault: true,
        },
      },
    },
  });

  // Grant video access if specific videos were selected
  if (videoIds && videoIds.length > 0) {
    await db.videoAccess.createMany({
      data: videoIds.map((videoId) => ({
        videoId,
        userId: newUser.id,
        accessType: 'VIEW' as const,
      })),
      skipDuplicates: true,
    });
  }

  await logAction(user.id, 'USER_INVITED', 'User', newUser.id, {
    email,
    role,
    organizationId,
    videoIds,
  });

  return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // List pending Clerk invitations
  try {
    const clerk = await clerkClient();
    const invitations = await clerk.invitations.getInvitationList({ status: 'pending' });
    return NextResponse.json(
      invitations.data.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        status: inv.status,
        createdAt: inv.createdAt,
        metadata: inv.publicMetadata,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
