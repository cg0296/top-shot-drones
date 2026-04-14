import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

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
