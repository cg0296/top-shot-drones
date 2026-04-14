import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const league = await db.league.findUnique({ where: { id } });
  if (!league) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.league.delete({ where: { id } });

  await logAction(user.id, 'LEAGUE_DELETED', 'League', id, { name: league.name, slug: league.slug });

  return NextResponse.json({ ok: true });
}
