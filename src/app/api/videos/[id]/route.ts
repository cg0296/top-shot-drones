import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await db.video.findUnique({
    where: { id },
    include: {
      organization: true,
      uploadedBy: true,
    },
  });

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Authorization
  const role = user.role;
  let authorized = false;

  if (role === 'ADMIN') {
    authorized = true;
  } else if (role === 'STAFF' || role === 'CUSTOMER') {
    authorized = video.organizationId === user.organizationId;
  } else if (role === 'VIEWER') {
    const access = await db.videoAccess.findUnique({
      where: {
        videoId_userId: {
          videoId: video.id,
          userId: user.id,
        },
      },
    });
    authorized = !!access;
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    id: video.id,
    title: video.title,
    description: video.description,
    cloudflareVideoId: video.cloudflareVideoId,
    thumbnailUrl: video.thumbnailUrl,
    visibility: video.visibility,
    createdAt: video.createdAt,
    organization: {
      id: video.organization.id,
      name: video.organization.name,
    },
    uploadedBy: {
      id: video.uploadedBy.id,
      name: video.uploadedBy.name,
    },
  });
}
