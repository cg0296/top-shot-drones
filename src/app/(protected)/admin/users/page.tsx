export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import CreateUserForm from '@/components/create-user-form';

export const metadata = {
  title: 'Manage Users — Top Shot Drones',
};

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  STAFF: 'bg-blue-100 text-blue-700',
  CUSTOMER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-slate-100 text-slate-600',
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
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
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Manage Users</h1>

      {/* Users table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                  {u.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {u.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeColors[u.role] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {u.organization?.name ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create user form */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Create New User
        </h2>
        <CreateUserForm organizations={organizations} />
      </div>
    </div>
  );
}
