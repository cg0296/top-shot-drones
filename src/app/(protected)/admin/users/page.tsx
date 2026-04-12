export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import InviteUserForm from '@/components/invite-user-form';
import UserTable from '@/components/user-table';

export const metadata = {
  title: 'Manage Users — Top Shot Drones',
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [users, organizations, videos] = await Promise.all([
    db.user.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.video.findMany({
      select: { id: true, title: true, organizationId: true },
      orderBy: { title: 'asc' },
    }),
  ]);

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

      {/* Invite user */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Invite User
        </h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Send an email invitation. The user will create their account via the link and automatically get the role and video access you set here.
        </p>
        <InviteUserForm organizations={organizations} videos={videos} />
      </div>

      {/* User table */}
      <UserTable
        users={serializedUsers}
        organizations={organizations}
        currentUserId={user.id}
      />
    </div>
  );
}
