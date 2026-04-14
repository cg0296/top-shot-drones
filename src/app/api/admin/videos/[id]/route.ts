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

  // Delete from Cloudflare Stream first (best effort — continue if it fails)
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  let cloudflareDeleted = false;
  if (accountId && apiToken) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${video.cloudflareVideoId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } },
      );
      cloudflareDeleted = res.ok || res.status === 404;
      if (!cloudflareDeleted) {
        console.error('Cloudflare delete failed:', video.cloudflareVideoId, res.status);
      }
    } catch (err) {
      console.error('Cloudflare delete threw:', err);
    }
  }

  // Delete DB rows — cascade handles comments/reactions/videoAccess via onDelete: Cascade
  await db.video.delete({ where: { id } });

  await logAction(user.id, 'VIDEO_DELETED', 'Video', id, {
    title: video.title,
    cloudflareVideoId: video.cloudflareVideoId,
    cloudflareDeleted,
  });

  return NextResponse.json({ ok: true, cloudflareDeleted });
}
