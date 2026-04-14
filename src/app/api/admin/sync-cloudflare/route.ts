import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim();

interface CfVideo {
  uid: string;
  meta: Record<string, string> & { name?: string };
  duration: number;
  thumbnail: string;
  status: { state: string };
  created: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function upsertOrg(slug: string, name?: string) {
  if (!slug) return null;
  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) return existing;
  return db.organization.create({
    data: { slug, name: name || slug },
  });
}

async function upsertSeason(organizationId: string, slug: string, name?: string) {
  const existing = await db.season.findUnique({
    where: { organizationId_slug: { organizationId, slug } },
  });
  if (existing) return existing;
  return db.season.create({
    data: { organizationId, slug, name: name || slug },
  });
}

async function upsertGame(
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string | null,
  slug: string,
  title: string,
  playedAt: Date,
) {
  const existing = await db.game.findUnique({
    where: { seasonId_slug: { seasonId, slug } },
  });
  if (existing) return existing;
  return db.game.create({
    data: {
      seasonId,
      homeTeamId,
      awayTeamId,
      slug,
      title,
      playedAt,
    },
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_SUBDOMAIN) {
    return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 500 });
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

  let fallbackOrgId: string | null =
    user.memberships.find((m) => m.isDefault)?.organizationId ??
    user.memberships[0]?.organizationId ??
    null;
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
    const thumbnailUrl = `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${v.uid}/thumbnails/thumbnail.jpg?time=5s`;

    // 1. Resolve home team (required for game-tagged videos)
    let homeTeam = null;
    if (meta.homeTeamId) {
      homeTeam = await db.organization.findUnique({ where: { id: meta.homeTeamId } });
    }
    if (!homeTeam && meta.homeTeamSlug) {
      homeTeam = await upsertOrg(meta.homeTeamSlug, meta.homeTeamName);
    }

    // 2. Resolve away team (optional)
    let awayTeam = null;
    if (meta.awayTeamId) {
      awayTeam = await db.organization.findUnique({ where: { id: meta.awayTeamId } });
    }
    if (!awayTeam && meta.awayTeamSlug) {
      awayTeam = await upsertOrg(meta.awayTeamSlug, meta.awayTeamName);
    }

    // 3. Resolve season (scoped to home team for now)
    let season = null;
    if (meta.seasonId) {
      season = await db.season.findUnique({ where: { id: meta.seasonId } });
    }
    if (!season && meta.seasonSlug && homeTeam) {
      season = await upsertSeason(homeTeam.id, meta.seasonSlug, meta.seasonName);
    }

    // 4. Resolve game
    let game = null;
    if (meta.gameId) {
      game = await db.game.findUnique({ where: { id: meta.gameId } });
    }
    if (!game && season && homeTeam) {
      const gameDate = meta.gameDate ? new Date(meta.gameDate) : new Date(v.created);
      const gameSlug =
        meta.gameSlug ||
        `${gameDate.toISOString().slice(0, 10)}-${homeTeam.slug}${awayTeam ? '-vs-' + awayTeam.slug : ''}`;
      const gameTitle =
        meta.gameTitle ||
        (awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : homeTeam.name);
      game = await upsertGame(
        season.id,
        homeTeam.id,
        awayTeam?.id ?? null,
        gameSlug,
        gameTitle,
        gameDate,
      );
    }

    const orgIdForVideo = homeTeam?.id ?? fallbackOrgId;
    if (!orgIdForVideo) {
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
            ...(game && !existing.gameId ? { gameId: game.id } : {}),
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
            organizationId: orgIdForVideo,
            uploadedByUserId: user.id,
            visibility: 'ORG',
            gameId: game?.id ?? undefined,
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
