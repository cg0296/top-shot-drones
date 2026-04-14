import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const createSchema = z.object({
  seasonId: z.string().min(1),
  title: z.string().min(1),
  opponent: z.string().optional(),
  homeAway: z.enum(['home', 'away']).optional(),
  playedAt: z.string().datetime(),
  slug: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const seasonId = request.nextUrl.searchParams.get('seasonId');
  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 });

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role !== 'ADMIN' && user.organizationId !== season.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const games = await db.game.findMany({
    where: { seasonId },
    orderBy: { playedAt: 'desc' },
  });

  return NextResponse.json(games);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { seasonId, title, opponent, homeAway, playedAt } = parsed.data;

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  if (user.role === 'STAFF' && user.organizationId !== season.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const date = new Date(playedAt);
  const datePart = date.toISOString().slice(0, 10);
  const slug = parsed.data.slug
    ? slugify(parsed.data.slug)
    : `${datePart}-${slugify(opponent || title)}`;

  try {
    const game = await db.game.create({
      data: {
        seasonId,
        title,
        opponent,
        homeAway,
        playedAt: date,
        slug,
      },
    });
    return NextResponse.json(game, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Slug already in use for this season' }, { status: 409 });
  }
}
