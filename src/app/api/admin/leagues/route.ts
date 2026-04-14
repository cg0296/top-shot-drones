import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const createLeagueSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens (e.g. "fall-2025")',
    ),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const result = createLeagueSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', errors: result.error.issues },
      { status: 400 },
    );
  }

  const { name, slug, description } = result.data;

  const existing = await db.league.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
  }

  const league = await db.league.create({ data: { name, slug, description } });

  await logAction(user.id, 'LEAGUE_CREATED', 'League', league.id, { name, slug });

  return NextResponse.json(league, { status: 201 });
}
