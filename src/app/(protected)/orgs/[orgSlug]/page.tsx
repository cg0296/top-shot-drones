export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

type Props = { params: Promise<{ orgSlug: string }> };

export default async function OrgSeasonsPage({ params }: Props) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  const orgIds = user.memberships.map((m) => m.organizationId);
  if (user.role !== 'ADMIN' && !orgIds.includes(org.id)) {
    redirect('/orgs');
  }

  // Seasons where this org played as home OR away — derived from games
  const gameSeasonIds = await db.game.findMany({
    where: { OR: [{ homeTeamId: org.id }, { awayTeamId: org.id }] },
    select: { seasonId: true },
    distinct: ['seasonId'],
  });
  const seasonIds = gameSeasonIds.map((g) => g.seasonId);

  // Also include seasons explicitly owned by this org (even without games yet)
  const seasons = await db.season.findMany({
    where: {
      OR: [
        { id: { in: seasonIds } },
        { organizationId: org.id },
      ],
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      _count: {
        select: {
          games: {
            where: { OR: [{ homeTeamId: org.id }, { awayTeamId: org.id }] },
          },
        },
      },
    },
  });

  return (
    <div className="animate-fade-in">
      <Link href="/orgs" className="mb-4 inline-block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        ← All organizations
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight gradient-text">{org.name}</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Seasons</p>

      {seasons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
          No seasons yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/orgs/${org.slug}/${s.slug}`}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]"
            >
              <h2 className="text-lg font-semibold group-hover:text-[var(--accent)]">{s.name}</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {s._count.games} game{s._count.games !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
