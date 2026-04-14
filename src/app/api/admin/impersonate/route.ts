import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod/v4';
import { getRealUser, IMPERSONATION_COOKIE } from '@/lib/clerk-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const startSchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  const real = await getRealUser();
  if (!real) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (real.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { userId } = parsed.data;
  if (userId === real.id) {
    return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Session cookie — cleared when the admin closes the browser
  });

  await logAction(real.id, 'IMPERSONATION_STARTED', 'User', userId, {
    targetEmail: target.email,
  });

  return NextResponse.json({ ok: true, impersonating: { id: target.id, name: target.name } });
}

export async function DELETE() {
  const real = await getRealUser();
  if (!real) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const existing = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  cookieStore.delete(IMPERSONATION_COOKIE);

  if (existing) {
    await logAction(real.id, 'IMPERSONATION_STOPPED', 'User', existing, {});
  }

  return NextResponse.json({ ok: true });
}
