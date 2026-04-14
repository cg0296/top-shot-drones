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
  const org = await db.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.organization.delete({ where: { id } });

  await logAction(user.id, 'ORGANIZATION_DELETED', 'Organization', id, { name: org.name, slug: org.slug });

  return NextResponse.json({ ok: true });
}
