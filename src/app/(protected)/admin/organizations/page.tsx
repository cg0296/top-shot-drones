export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import CreateOrgForm from '@/components/create-org-form';

export const metadata = {
  title: 'Manage Organizations — Top Shot Drones',
};

export default async function AdminOrganizationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') redirect('/dashboard');

  const organizations = await db.organization.findMany({
    include: {
      _count: {
        select: { users: true, videos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">
        Manage Organizations
      </h1>

      {organizations.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-300">
          <p className="text-sm text-slate-500">No organizations yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Slug</th>
                <th className="px-4 py-3 font-medium text-slate-700">Users</th>
                <th className="px-4 py-3 font-medium text-slate-700">Videos</th>
                <th className="px-4 py-3 font-medium text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {org.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{org.slug}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {org._count.users}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {org._count.videos}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(org.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Create Organization
        </h2>
        <CreateOrgForm />
      </div>
    </div>
  );
}
