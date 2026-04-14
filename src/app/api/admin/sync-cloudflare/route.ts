import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;

interface CfVideo {
  uid: string;
  meta: Record<string, string> & { name?: string };
  duration: number;
  thumbnail: string;
  status: { state: string };
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_SUBDOMAIN) {
    return NextResponse.json(
      { error: 'Cloudflare credentials not configured' },
      { status: 500 },
    );
  }

  const allVideos: CfVideo[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } },
    );
    const data = await res.json();
    const videos = data.result as CfVideo[];
    if (!videos || videos.length === 0) break;
    allVideos.push(...videos);
    if (videos.length < 100) break;
    page++;
  }

  const ready = allVideos.filter((v) => v.status.state === 'ready');

  // Fallback org for videos without meta.orgId
  let fallbackOrgId = user.organizationId;
  if (!fallbackOrgId) {
    const firstOrg = await db.organization.findFirst();
    fallbackOrgId = firstOrg?.id ?? null;
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const v of ready) {
    const meta = v.meta || {};
    const title =
      (meta.name || '').replace(/\.(MOV|MP4|mp4|mov)$/i, '').replace(/_/g, ' ') || 'Untitled';
    const thumbnailUrl = `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${v.uid}/thumbnails/thumbnail.jpg`;

    // Resolve organization and game from meta if present
    let orgId = meta.orgId && (await db.organization.findUnique({ where: { id: meta.orgId } }))
      ? meta.orgId
      : null;
    let gameId: string | null = null;
    if (meta.gameId) {
      const game = await db.game.findUnique({
        where: { id: meta.gameId },
        include: { season: true },
      });
      if (game) {
        gameId = game.id;
        if (!orgId) orgId = game.season.organizationId;
      }
    }
    if (!orgId) orgId = fallbackOrgId;
    if (!orgId) {
      skipped++;
      continue;
    }

    const kind = meta.kind || null;

    try {
      const existing = await db.video.findUnique({ where: { cloudflareVideoId: v.uid } });
      if (existing) {
        await db.video.update({
          where: { cloudflareVideoId: v.uid },
          data: {
            thumbnailUrl,
            ...(gameId && !existing.gameId ? { gameId } : {}),
            ...(kind && !existing.kind ? { kind } : {}),
          },
        });
        updated++;
      } else {
        await db.video.create({
          data: {
            title,
            cloudflareVideoId: v.uid,
            thumbnailUrl,
            organizationId: orgId,
            uploadedByUserId: user.id,
            visibility: 'ORG',
            gameId: gameId ?? undefined,
            kind: kind ?? undefined,
          },
        });
        imported++;
      }
    } catch (err) {
      console.error('Sync error for', v.uid, err);
      skipped++;
    }
  }

  return NextResponse.json({
    total: allVideos.length,
    ready: ready.length,
    imported,
    updated,
    skipped,
  });
}
