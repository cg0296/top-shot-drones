export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export const metadata = { title: 'Organizations — Top Shot Drones' };

export default async function OrgsIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const orgIds = user.memberships.map((m) => m.organizationId);
  const orgs =
    user.role === 'ADMIN'
      ? await db.organization.findMany({ orderBy: { name: 'asc' } })
      : orgIds.length
      ? await db.organization.findMany({
          where: { id: { in: orgIds } },
          orderBy: { name: 'asc' },
        })
      : [];

  if (orgs.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="mb-6 text-2xl font-bold tracking-tight gradient-text">Organizations</h1>
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
          You&apos;re not part of any organization yet.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold tracking-tight gradient-text">Organizations</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map((org) => (
          <Link
            key={org.id}
            href={`/orgs/${org.slug}`}
            className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]"
          >
            <h2 className="text-lg font-semibold group-hover:text-[var(--accent)]">{org.name}</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{org.slug}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
