export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import CreateUserForm from '@/components/create-user-form';
import UserTable from '@/components/user-table';

export const metadata = {
  title: 'Manage Users — Top Shot Drones',
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [users, organizations] = await Promise.all([
    db.user.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Serialize for client component
  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    organizationId: u.organizationId,
    organizationName: u.organization?.name ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold tracking-tight gradient-text">Manage Users</h1>

      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Create New User
        </h2>
        <CreateUserForm organizations={organizations} />
      </div>

      <UserTable
        users={serializedUsers}
        organizations={organizations}
        currentUserId={user.id}
      />
    </div>
  );
}
