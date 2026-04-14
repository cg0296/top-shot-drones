import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const upsertSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER', 'VIEWER']).default('CUSTOMER'),
  isDefault: z.boolean().optional(),
});

const removeSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { userId, organizationId, role, isDefault } = parsed.data;

  // If marking as default, clear existing default for this user
  if (isDefault) {
    await db.organizationMembership.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const membership = await db.organizationMembership.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    update: { role, ...(isDefault !== undefined ? { isDefault } : {}) },
    create: { userId, organizationId, role, isDefault: isDefault ?? false },
    include: { organization: true },
  });

  return NextResponse.json(membership);
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { userId, organizationId } = parsed.data;

  await db.organizationMembership.delete({
    where: { userId_organizationId: { userId, organizationId } },
  });

  return NextResponse.json({ ok: true });
}
