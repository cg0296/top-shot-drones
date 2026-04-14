import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const schema = z.object({
  gameId: z.string().optional(),
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().optional(),
  seasonId: z.string().optional(),
  kind: z.string().optional(),
  name: z.string().optional(),
  maxDurationSeconds: z.number().int().positive().max(21600).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 500 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { gameId, name, maxDurationSeconds = 7200 } = parsed.data;
  const kind = 'drone';
  let { homeTeamId, awayTeamId, seasonId } = parsed.data;

  // If a game is specified, derive teams and season from it
  if (gameId) {
    const game = await db.game.findUnique({
      where: { id: gameId },
      include: { season: true },
    });
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    homeTeamId = game.homeTeamId;
    awayTeamId = game.awayTeamId ?? undefined;
    seasonId = game.seasonId;
  }

  if (!homeTeamId) {
    return NextResponse.json({ error: 'homeTeamId or gameId is required' }, { status: 400 });
  }

  // STAFF restriction: can only upload for teams they belong to
  const staffOrgIds = user.memberships.map((m) => m.organizationId);
  if (
    user.role === 'STAFF' &&
    !staffOrgIds.includes(homeTeamId) &&
    (!awayTeamId || !staffOrgIds.includes(awayTeamId))
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch slugs/names for richer metadata (so an external sync can resolve by slug too)
  const [homeTeam, awayTeam, season, game] = await Promise.all([
    db.organization.findUnique({ where: { id: homeTeamId } }),
    awayTeamId ? db.organization.findUnique({ where: { id: awayTeamId } }) : Promise.resolve(null),
    seasonId ? db.season.findUnique({ where: { id: seasonId } }) : Promise.resolve(null),
    gameId ? db.game.findUnique({ where: { id: gameId } }) : Promise.resolve(null),
  ]);

  if (!homeTeam) return NextResponse.json({ error: 'Home team not found' }, { status: 404 });

  const meta: Record<string, string> = {
    uploadedById: user.id,
    homeTeamId,
    homeTeamSlug: homeTeam.slug,
    homeTeamName: homeTeam.name,
  };
  if (awayTeamId && awayTeam) {
    meta.awayTeamId = awayTeamId;
    meta.awayTeamSlug = awayTeam.slug;
    meta.awayTeamName = awayTeam.name;
  }
  if (seasonId && season) {
    meta.seasonId = seasonId;
    meta.seasonSlug = season.slug;
    meta.seasonName = season.name;
  }
  if (gameId && game) {
    meta.gameId = gameId;
    meta.gameSlug = game.slug;
    meta.gameTitle = game.title;
    meta.gameDate = game.playedAt.toISOString().slice(0, 10);
  }
  if (kind) meta.kind = kind;
  if (name) meta.name = name;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maxDurationSeconds, meta }),
    },
  );

  const data = await res.json();
  if (!data.success) {
    console.error('Cloudflare direct_upload failed:', data);
    return NextResponse.json({ error: 'Cloudflare upload URL creation failed' }, { status: 502 });
  }

  return NextResponse.json({
    uploadURL: data.result.uploadURL,
    uid: data.result.uid,
  });
}
