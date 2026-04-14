import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const schema = z.object({
  organizationId: z.string().min(1),
  gameId: z.string().optional(),
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

  const { organizationId, gameId, kind, name, maxDurationSeconds = 7200 } = parsed.data;

  if (user.role === 'STAFF' && user.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let seasonId: string | undefined;
  if (gameId) {
    const game = await db.game.findUnique({
      where: { id: gameId },
      include: { season: true },
    });
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (game.season.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Game does not belong to this organization' }, { status: 400 });
    }
    seasonId = game.seasonId;
  }

  const meta: Record<string, string> = {
    orgId: organizationId,
    uploadedById: user.id,
  };
  if (seasonId) meta.seasonId = seasonId;
  if (gameId) meta.gameId = gameId;
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
      body: JSON.stringify({
        maxDurationSeconds,
        meta,
      }),
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
