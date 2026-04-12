export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import CreateUserForm from '@/components/create-user-form';

export const metadata = {
  title: 'Manage Users — Top Shot Drones',
};

const roleBadge: Record<string, string> = {
  ADMIN: 'badge-red',
  STAFF: 'badge-blue',
  CUSTOMER: 'badge-green',
  VIEWER: 'badge-slate',
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

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold tracking-tight gradient-text">Manage Users</h1>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="table-dark min-w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-[var(--text-primary)]">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${roleBadge[u.role] ?? 'badge-slate'}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.organization?.name ?? '—'}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-[var(--text-muted)]">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Create New User
        </h2>
        <CreateUserForm organizations={organizations} />
      </div>
    </div>
  );
}
