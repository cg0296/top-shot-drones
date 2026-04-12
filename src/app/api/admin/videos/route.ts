import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const createVideoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  cloudflareVideoId: z.string().min(1, 'Cloudflare Video ID is required'),
  organizationId: z.string().min(1, 'Organization is required'),
  visibility: z.enum(['PUBLIC', 'ORG', 'PRIVATE']),
  thumbnailUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createVideoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { title, description, cloudflareVideoId, organizationId, visibility, thumbnailUrl } =
    parsed.data;

  // STAFF can only create videos in their own organization
  if (user.role === 'STAFF' && organizationId !== user.organizationId) {
    return NextResponse.json(
      { error: 'You can only register videos in your own organization' },
      { status: 403 },
    );
  }

  // Check for duplicate Cloudflare Video ID
  const existing = await db.video.findUnique({
    where: { cloudflareVideoId },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Cloudflare Video ID already registered' },
      { status: 409 },
    );
  }

  const video = await db.video.create({
    data: {
      title,
      description,
      cloudflareVideoId,
      organizationId,
      visibility,
      thumbnailUrl,
      uploadedByUserId: user.id,
    },
  });

  return NextResponse.json(video, { status: 201 });
}
