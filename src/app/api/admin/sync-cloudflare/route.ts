import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;

interface CfVideo {
  uid: string;
  meta: { name?: string };
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

  // Fetch all videos from Cloudflare Stream (paginated)
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

  // Determine the user's org (fallback to first org if admin has none)
  let orgId = user.organizationId;
  if (!orgId) {
    const firstOrg = await db.organization.findFirst();
    orgId = firstOrg?.id ?? null;
  }
  if (!orgId) {
    return NextResponse.json(
      { error: 'No organization found to assign videos to' },
      { status: 400 },
    );
  }

  let imported = 0;
  let skipped = 0;

  for (const v of ready) {
    const title =
      v.meta.name?.replace(/\.MOV$/i, '').replace(/_/g, ' ') ?? 'Untitled';
    const thumbnailUrl = `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${v.uid}/thumbnails/thumbnail.jpg`;

    try {
      await db.video.upsert({
        where: { cloudflareVideoId: v.uid },
        update: { thumbnailUrl },
        create: {
          title,
          cloudflareVideoId: v.uid,
          thumbnailUrl,
          organizationId: orgId,
          uploadedByUserId: user.id,
          visibility: 'ORG',
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    total: allVideos.length,
    ready: ready.length,
    imported,
    skipped,
  });
}
