import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER', 'VIEWER']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  if (currentUser.id === id) {
    return NextResponse.json(
      { error: 'Cannot change your own role' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const result = updateUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', errors: result.error.issues },
      { status: 400 },
    );
  }

  const { role } = result.data;

  const updatedUser = await db.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  await logAction(currentUser.id, 'USER_UPDATED', 'User', id, { role });

  return NextResponse.json(updatedUser);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  if (currentUser.id === id) {
    return NextResponse.json(
      { error: 'Cannot delete yourself' },
      { status: 400 },
    );
  }

  const deletedUser = await db.user.delete({
    where: { id },
  });

  await logAction(currentUser.id, 'USER_DELETED', 'User', id, {
    email: deletedUser.email,
  });

  return NextResponse.json({ success: true });
}
