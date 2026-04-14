import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const game = await db.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { title, homeTeamId, awayTeamId, notes } = parsed.data;

  const updated = await db.game.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(homeTeamId !== undefined ? { homeTeamId } : {}),
      ...(awayTeamId !== undefined ? { awayTeamId } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: { homeTeam: true, awayTeam: true },
  });

  await logAction(user.id, 'GAME_UPDATED', 'Game', id, { title, homeTeamId, awayTeamId });

  return NextResponse.json(updated);
}
