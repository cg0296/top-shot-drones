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
  name: z.string().min(1),
  organizationId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  slug: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = request.nextUrl.searchParams.get('organizationId');
  if (!orgId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

  if (user.role !== 'ADMIN' && !user.memberships.some((m) => m.organizationId === orgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const seasons = await db.season.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(seasons);
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

  const { name, organizationId, startDate, endDate } = parsed.data;
  const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(name);

  if (user.role === 'STAFF' && !user.memberships.some((m) => m.organizationId === organizationId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const season = await db.season.create({
      data: {
        name,
        slug,
        organizationId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    return NextResponse.json(season, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Slug already in use for this organization' }, { status: 409 });
  }
}
