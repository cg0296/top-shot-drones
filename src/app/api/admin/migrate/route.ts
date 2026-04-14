import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.$executeRawUnsafe(`ALTER TABLE games ADD COLUMN IF NOT EXISTS notes TEXT`);

  return NextResponse.json({ ok: true, message: 'Migration applied: games.notes column added' });
}
