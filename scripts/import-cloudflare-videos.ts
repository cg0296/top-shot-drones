import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const CF_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN!;
const DATABASE_URL = process.env.DATABASE_URL!;
const ORG_ID = 'org-topshot';
const UPLOADER_ID = 'user-admin';

interface CfVideo {
  uid: string;
  meta: { name?: string };
  duration: number;
  thumbnail: string;
  status: { state: string };
}

async function fetchAllVideos(): Promise<CfVideo[]> {
  const all: CfVideo[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } },
    );
    const data = await res.json();
    const videos = data.result as CfVideo[];
    if (!videos || videos.length === 0) break;
    all.push(...videos);
    if (videos.length < 50) break;
    page++;
  }
  return all;
}

async function main() {
  const adapter = new PrismaPg(DATABASE_URL);
  const db = new PrismaClient({ adapter });

  const videos = await fetchAllVideos();
  const ready = videos.filter((v) => v.status.state === 'ready');
  console.log(`Found ${videos.length} total videos, ${ready.length} ready to import`);

  let imported = 0;
  let skipped = 0;

  for (const v of ready) {
    const title = v.meta.name?.replace(/\.MOV$/i, '').replace(/_/g, ' ') ?? 'Untitled';
    const thumbnailUrl = `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${v.uid}/thumbnails/thumbnail.jpg`;

    try {
      await db.video.upsert({
        where: { cloudflareVideoId: v.uid },
        update: { thumbnailUrl },
        create: {
          title,
          cloudflareVideoId: v.uid,
          thumbnailUrl,
          organizationId: ORG_ID,
          uploadedByUserId: UPLOADER_ID,
          visibility: 'ORG',
        },
      });
      imported++;
      console.log(`  Imported: ${title} (${v.uid.substring(0, 12)}...)`);
    } catch (e) {
      skipped++;
      console.log(`  Skipped: ${v.uid} — ${(e as Error).message}`);
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);
  await db.$disconnect();
}

main();
