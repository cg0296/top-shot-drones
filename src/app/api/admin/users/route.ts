import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getCurrentUser } from '@/lib/auth-helpers';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { logAction } from '@/lib/audit';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER', 'VIEWER']),
  organizationId: z.string().optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', errors: result.error.issues },
      { status: 400 },
    );
  }

  const { name, email, password, role, organizationId } = result.data;

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json(
      { error: 'Email already in use' },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);

  const newUser = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      ...(organizationId
        ? {
            memberships: {
              create: {
                organizationId,
                role,
                isDefault: true,
              },
            },
          }
        : {}),
    },
  });

  await logAction(currentUser.id, 'USER_CREATED', 'User', newUser.id);

  const { passwordHash: _, ...userWithoutPassword } = newUser;

  return NextResponse.json(userWithoutPassword, { status: 201 });
}
