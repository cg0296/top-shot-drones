import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_EMOJIS = ['fire', 'heart', 'clap', 'mindblown', 'trophy'];

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id: videoId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reactions = await db.reaction.findMany({
    where: { videoId },
  });

  // Group by emoji: { fire: { count: 3, reacted: true }, ... }
  const grouped: Record<string, { count: number; reacted: boolean }> = {};
  for (const emoji of ALLOWED_EMOJIS) {
    grouped[emoji] = { count: 0, reacted: false };
  }
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { count: 0, reacted: false };
    }
    grouped[r.emoji].count++;
    if (r.userId === user.id) {
      grouped[r.emoji].reacted = true;
    }
  }

  return NextResponse.json(grouped);
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
  const emoji = typeof body.emoji === 'string' ? body.emoji : '';

  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json(
      { error: `Invalid emoji. Allowed: ${ALLOWED_EMOJIS.join(', ')}` },
      { status: 400 },
    );
  }

  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Toggle: if reaction exists, remove it; otherwise create it
  const existing = await db.reaction.findUnique({
    where: {
      videoId_userId_emoji: { videoId, userId: user.id, emoji },
    },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: 'removed' });
  }

  await db.reaction.create({
    data: { videoId, userId: user.id, emoji },
  });

  return NextResponse.json({ action: 'added' }, { status: 201 });
}
