import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

const videoSelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  visibility: true,
  createdAt: true,
  organization: { select: { name: true } },
} satisfies Prisma.VideoSelect;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const orgSlug = searchParams.get('org');

  switch (user.role) {
    case 'ADMIN': {
      const where: Prisma.VideoWhereInput = orgSlug
        ? { organization: { slug: orgSlug } }
        : {};

      const videos = await db.video.findMany({
        where,
        select: videoSelect,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(videos);
    }

    case 'STAFF':
    case 'CUSTOMER': {
      if (!user.organizationId) return NextResponse.json([]);
      const videos = await db.video.findMany({
        where: { organizationId: user.organizationId },
        select: videoSelect,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(videos);
    }

    case 'VIEWER': {
      const videos = await db.video.findMany({
        where: {
          videoAccess: { some: { userId: user.id } },
        },
        select: videoSelect,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(videos);
    }

    default:
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
