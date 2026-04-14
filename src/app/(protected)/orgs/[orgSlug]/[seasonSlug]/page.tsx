export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

type Props = { params: Promise<{ orgSlug: string; seasonSlug: string }> };

export default async function SeasonGamesPage({ params }: Props) {
  const { orgSlug, seasonSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  if (user.role !== 'ADMIN' && user.organizationId !== org.id) {
    redirect('/orgs');
  }

  const season = await db.season.findUnique({
    where: { organizationId_slug: { organizationId: org.id, slug: seasonSlug } },
  });
  if (!season) notFound();

  const games = await db.game.findMany({
    where: { seasonId: season.id },
    orderBy: { playedAt: 'desc' },
    include: { _count: { select: { videos: true } } },
  });

  return (
    <div className="animate-fade-in">
      <Link href={`/orgs/${org.slug}`} className="mb-4 inline-block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        ← {org.name}
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight gradient-text">{season.name}</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">Games</p>

      {games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
          No games in this season yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/orgs/${org.slug}/${season.slug}/${g.slug}`}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]"
            >
              <h2 className="text-lg font-semibold group-hover:text-[var(--accent)]">{g.title}</h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{new Date(g.playedAt).toLocaleDateString()}</span>
                {g.opponent && (<><span>·</span><span>vs {g.opponent}</span></>)}
                {g.homeAway && (<><span>·</span><span>{g.homeAway}</span></>)}
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {g._count.videos} video{g._count.videos !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
