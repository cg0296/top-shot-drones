import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id: videoId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const comments = await db.comment.findMany({
    where: { videoId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      user: { id: c.user.id, name: c.user.name },
    })),
  );
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id: videoId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const text = typeof body.body === 'string' ? body.body.trim() : '';

  if (!text || text.length > 2000) {
    return NextResponse.json(
      { error: 'Comment must be 1-2000 characters' },
      { status: 400 },
    );
  }

  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const comment = await db.comment.create({
    data: { videoId, userId: user.id, body: text },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      user: { id: comment.user.id, name: comment.user.name },
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id: videoId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = await request.json();
  if (!commentId) {
    return NextResponse.json({ error: 'commentId required' }, { status: 400 });
  }

  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.videoId !== videoId) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Only the author or an admin can delete
  if (comment.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });

  return NextResponse.json({ ok: true });
}
