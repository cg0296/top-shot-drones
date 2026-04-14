export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { cfThumbnail } from '@/lib/utils';

type Props = { params: Promise<{ orgSlug: string; seasonSlug: string; gameSlug: string }> };

export default async function GameVideosPage({ params }: Props) {
  const { orgSlug, seasonSlug, gameSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  const orgIds = user.memberships.map((m) => m.organizationId);
  if (user.role !== 'ADMIN' && !orgIds.includes(org.id)) {
    redirect('/orgs');
  }

  const season = await db.season.findFirst({ where: { slug: seasonSlug } });
  if (!season) notFound();

  const game = await db.game.findUnique({
    where: { seasonId_slug: { seasonId: season.id, slug: gameSlug } },
    include: {
      homeTeam: true,
      awayTeam: true,
      videos: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!game) notFound();

  // Access: viewed team must be a participant
  if (
    user.role !== 'ADMIN' &&
    game.homeTeamId !== org.id &&
    game.awayTeamId !== org.id
  ) {
    redirect('/orgs');
  }

  const isHome = game.homeTeamId === org.id;
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  return (
    <div className="animate-fade-in">
      <Link href={`/orgs/${org.slug}/${season.slug}`} className="mb-4 inline-block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        ← {season.name}
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight gradient-text">
        {isHome ? 'vs' : '@'} {opponent?.name ?? 'TBD'}
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        {new Date(game.playedAt).toLocaleDateString()} · {isHome ? 'Home' : 'Away'}
      </p>

      {game.videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
          No videos for this game yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {game.videos.map((v) => (
            <Link
              key={v.id}
              href={`/videos/${v.id}`}
              className="video-card group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <div className="relative aspect-video bg-[var(--bg-secondary)]">
                {cfThumbnail(v.thumbnailUrl) && (
                  <img src={cfThumbnail(v.thumbnailUrl)!} alt={v.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                )}
              </div>
              <div className="p-3.5">
                <h3 className="truncate text-sm font-semibold">{v.title}</h3>
                {v.kind && <p className="mt-1 text-xs text-[var(--text-muted)] capitalize">{v.kind}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
