export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import CreateOrgForm from '@/components/create-org-form';
import DeleteOrgButton from '@/components/delete-org-button';

export const metadata = {
  title: 'Manage Organizations — Top Shot Drones',
};

export default async function AdminOrganizationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') redirect('/dashboard');

  const organizations = await db.organization.findMany({
    include: {
      _count: {
        select: { memberships: true, videos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="animate-fade-in">
      <h1 className="mb-8 text-2xl font-bold tracking-tight gradient-text">
        Manage Organizations
      </h1>

      {organizations.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)]">No organizations yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="table-dark w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Users</th>
                <th>Videos</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td className="font-medium text-[var(--text-primary)]">{org.name}</td>
                  <td className="font-mono text-xs">{org.slug}</td>
                  <td>{org._count.memberships}</td>
                  <td>{org._count.videos}</td>
                  <td>
                    {new Date(org.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="text-right">
                    <DeleteOrgButton
                      orgId={org.id}
                      orgName={org.name}
                      memberCount={org._count.memberships}
                      videoCount={org._count.videos}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Create Organization
        </h2>
        <CreateOrgForm />
      </div>
    </div>
  );
}
