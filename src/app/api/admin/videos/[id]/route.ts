import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const updateVideoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'ORG', 'PRIVATE']),
  organizationId: z.string().min(1, 'Organization is required'),
  gameId: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'STAFF' && !user.memberships.some((m) => m.organizationId === video.organizationId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const result = updateVideoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', errors: result.error.issues },
      { status: 400 },
    );
  }

  const { title, description, visibility, organizationId, gameId } = result.data;

  // Verify the target org exists
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // STAFF may only assign to orgs they belong to
  if (user.role === 'STAFF' && !user.memberships.some((m) => m.organizationId === organizationId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If a gameId is provided, verify it exists
  if (gameId) {
    const game = await db.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const updated = await db.video.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      visibility,
      organizationId,
      gameId: gameId || null,
    },
  });

  await logAction(user.id, 'VIDEO_UPDATED', 'Video', id, {
    title: updated.title,
    visibility: updated.visibility,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // STAFF may only delete videos for teams they belong to
  if (user.role === 'STAFF' && !user.memberships.some((m) => m.organizationId === video.organizationId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // App-only delete. The Cloudflare Stream asset is intentionally left in place —
  // it can still be re-synced later. Never delete from Cloudflare here.
  await db.video.delete({ where: { id } });

  await logAction(user.id, 'VIDEO_DELETED', 'Video', id, {
    title: video.title,
    cloudflareVideoId: video.cloudflareVideoId,
  });

  return NextResponse.json({ ok: true });
}
