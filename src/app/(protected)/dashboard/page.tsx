export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/clerk-helpers';
import { db } from '@/lib/db';
import { cfThumbnail } from '@/lib/utils';
import UnlockButton from '@/components/unlock-button';

export const metadata = {
  title: 'Dashboard — Top Shot Drones',
};

type SearchParams = Promise<{ team?: string; season?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { effectiveUser } = await getAuthContext();
  if (!effectiveUser) redirect('/sign-in');

  const user = effectiveUser;
  const { team: teamParam, season: seasonParam } = await searchParams;

  if (user.role === 'ADMIN') {
    return (
      <AdminDashboard
        userName={user.name}
        teamSlug={teamParam}
        seasonSlug={seasonParam}
      />
    );
  }

  return (
    <MemberDashboard
      userId={user.id}
      userName={user.name}
      userRole={user.role}
      teamSlug={teamParam}
      seasonSlug={seasonParam}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Member dashboard                                                    */
/* ------------------------------------------------------------------ */

async function MemberDashboard({
  userId,
  userName,
  userRole,
  teamSlug,
  seasonSlug,
}: {
  userId: string;
  userName: string;
  userRole: string;
  teamSlug?: string;
  seasonSlug?: string;
}) {
  const memberships = await db.organizationMembership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
  });

  if (memberships.length === 0) {
    return (
      <div className="animate-fade-in">
        <DashboardHeader name={userName} roleLabel={userRole} teams={[]} />
        <EmptyState
          title="Welcome to Top Shot Drones"
          body="You're not on a team yet. Your admin will add you and your games will appear here."
        />
      </div>
    );
  }

  const orgIds = memberships.map((m) => m.organizationId);
  const orgsWithGames = await db.organization.findMany({
    where: {
      id: { in: orgIds },
      OR: [{ homeGames: { some: {} } }, { awayGames: { some: {} } }],
    },
    select: { id: true },
  });
  const orgsWithGamesSet = new Set(orgsWithGames.map((o) => o.id));

  const activeMembership =
    memberships.find((m) => m.organization.slug === teamSlug) ??
    memberships.find((m) => orgsWithGamesSet.has(m.organizationId)) ??
    memberships[0];
  const activeTeam = activeMembership.organization;

  // Seasons where this team participated (home/away games) OR is in via league membership
  const participatedSeasons = await db.season.findMany({
    where: {
      OR: [
        {
          games: {
            some: {
              OR: [{ homeTeamId: activeTeam.id }, { awayTeamId: activeTeam.id }],
            },
          },
        },
        {
          league: {
            memberships: { some: { orgId: activeTeam.id } },
          },
        },
      ],
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });

  const activeSeason =
    participatedSeasons.find((s) => s.slug === seasonSlug) ?? participatedSeasons[0] ?? null;

  // For league seasons, show ALL games in the season; for org seasons show only team's games
  const isLeagueSeason = !!activeSeason?.leagueId;

  const rawGames = activeSeason
    ? await db.game.findMany({
        where: {
          seasonId: activeSeason.id,
          ...(isLeagueSeason
            ? {}
            : { OR: [{ homeTeamId: activeTeam.id }, { awayTeamId: activeTeam.id }] }),
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          videos: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { playedAt: 'desc' },
      })
    : [];

  // Build access sets: VideoAccess grants + completed Purchases
  const videoIds = rawGames.flatMap((g) => g.videos.map((v) => v.id));

  const [accessGrants, purchases] = await Promise.all([
    videoIds.length > 0
      ? db.videoAccess.findMany({
          where: { userId, videoId: { in: videoIds } },
          select: { videoId: true },
        })
      : [],
    videoIds.length > 0 || activeSeason
      ? db.purchase.findMany({
          where: {
            userId,
            status: 'COMPLETED',
            OR: [
              ...(videoIds.length > 0 ? [{ videoId: { in: videoIds } }] : []),
              ...(activeSeason ? [{ seasonId: activeSeason.id }] : []),
            ],
          },
          select: { videoId: true, seasonId: true },
        })
      : [],
  ]);

  const accessibleVideoIds = new Set(accessGrants.map((a) => a.videoId));
  const purchasedVideoIds = new Set(
    purchases.filter((p) => p.videoId).map((p) => p.videoId!),
  );
  const hasPurchasedSeason = purchases.some((p) => p.seasonId === activeSeason?.id);

  const games = rawGames.map((g) => {
    const video = g.videos[0];
    const isTeamGame = g.homeTeamId === activeTeam.id || g.awayTeamId === activeTeam.id;
    const hasVideoAccess = video && accessibleVideoIds.has(video.id);
    const hasPurchase =
      video && (purchasedVideoIds.has(video.id) || hasPurchasedSeason);
    return {
      ...g,
      locked: video != null && !isTeamGame && !hasVideoAccess && !hasPurchase,
    };
  });

  // Team's own games first (featured from those), then others
  const teamGames = games.filter(
    (g) => g.homeTeamId === activeTeam.id || g.awayTeamId === activeTeam.id,
  );
  const otherGames = games.filter(
    (g) => g.homeTeamId !== activeTeam.id && g.awayTeamId !== activeTeam.id,
  );

  const featuredGame =
    teamGames.find((g) => g.videos.length > 0) ??
    games.find((g) => g.videos.length > 0) ??
    null;
  const remainingGames = games.filter((g) => g.id !== featuredGame?.id);

  return (
    <div className="animate-fade-in">
      <DashboardHeader
        name={userName}
        roleLabel={activeMembership.role}
        teams={memberships.map((m) => ({
          slug: m.organization.slug,
          name: m.organization.name,
          active: m.organizationId === activeTeam.id,
          hasGames: orgsWithGamesSet.has(m.organizationId),
        }))}
      />

      {participatedSeasons.length > 0 && (
        <SeasonChips
          teamSlug={activeTeam.slug}
          seasons={participatedSeasons.map((s) => ({
            slug: s.slug,
            name: s.name,
            active: activeSeason?.id === s.id,
          }))}
        />
      )}

      {!activeSeason ? (
        <EmptyState
          title="No seasons yet"
          body={`${activeTeam.name} hasn't played any games yet. Check back after your first game.`}
        />
      ) : games.length === 0 ? (
        <EmptyState
          title={`No games in ${activeSeason.name}`}
          body="Games will appear here as they happen."
        />
      ) : (
        <>
          {featuredGame && (
            <FeaturedGame
              game={featuredGame}
              viewedFrom={activeTeam.id}
              seasonId={activeSeason.id}
            />
          )}

          {remainingGames.length > 0 && (
            <>
              {isLeagueSeason && otherGames.length > 0 && (
                <h2 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Other games in {activeSeason.name}
                </h2>
              )}
              {!isLeagueSeason && (
                <h2 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  More games in {activeSeason.name}
                </h2>
              )}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {remainingGames.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    viewedFrom={activeTeam.id}
                    seasonId={activeSeason.id}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin dashboard — uses member layout across any selected team       */
/* ------------------------------------------------------------------ */

async function AdminDashboard({
  userName,
  teamSlug,
  seasonSlug,
}: {
  userName: string;
  teamSlug?: string;
  seasonSlug?: string;
}) {
  const orgs = await db.organization.findMany({ orderBy: { name: 'asc' } });

  if (orgs.length === 0) {
    return (
      <div className="animate-fade-in">
        <DashboardHeader name={userName} roleLabel="ADMIN" teams={[]} />
        <EmptyState
          title="No teams yet"
          body="Create your first organization from Admin → Organizations."
        />
      </div>
    );
  }

  const orgsWithGames = await db.organization.findMany({
    where: { OR: [{ homeGames: { some: {} } }, { awayGames: { some: {} } }] },
    select: { id: true },
  });
  const orgsWithGamesSet = new Set(orgsWithGames.map((o) => o.id));

  const activeTeam =
    orgs.find((o) => o.slug === teamSlug) ??
    orgs.find((o) => orgsWithGamesSet.has(o.id)) ??
    orgs[0];

  const participatedSeasons = await db.season.findMany({
    where: {
      OR: [
        {
          games: {
            some: {
              OR: [{ homeTeamId: activeTeam.id }, { awayTeamId: activeTeam.id }],
            },
          },
        },
        {
          league: {
            memberships: { some: { orgId: activeTeam.id } },
          },
        },
      ],
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });

  const activeSeason =
    participatedSeasons.find((s) => s.slug === seasonSlug) ?? participatedSeasons[0] ?? null;

  const isLeagueSeason = !!activeSeason?.leagueId;

  const rawGames = activeSeason
    ? await db.game.findMany({
        where: {
          seasonId: activeSeason.id,
          ...(isLeagueSeason
            ? {}
            : { OR: [{ homeTeamId: activeTeam.id }, { awayTeamId: activeTeam.id }] }),
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          videos: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { playedAt: 'desc' },
      })
    : [];

  // Admin always has full access — nothing locked
  const games = rawGames.map((g) => ({ ...g, locked: false }));

  const featuredGame = games.find((g) => g.videos.length > 0) ?? null;
  const otherGames = games.filter((g) => g.id !== featuredGame?.id);

  return (
    <div className="animate-fade-in">
      <DashboardHeader
        name={userName}
        roleLabel="ADMIN"
        teams={orgs.map((o) => ({
          slug: o.slug,
          name: o.name,
          active: o.id === activeTeam.id,
          hasGames: orgsWithGamesSet.has(o.id),
        }))}
      />

      {participatedSeasons.length > 0 && (
        <SeasonChips
          teamSlug={activeTeam.slug}
          seasons={participatedSeasons.map((s) => ({
            slug: s.slug,
            name: s.name,
            active: activeSeason?.id === s.id,
          }))}
        />
      )}

      {!activeSeason ? (
        <EmptyState title={`${activeTeam.name} has no games yet`} body="Upload a video to create the first game." />
      ) : games.length === 0 ? (
        <EmptyState title={`No games in ${activeSeason.name}`} body="" />
      ) : (
        <>
          {featuredGame && (
            <FeaturedGame
              game={featuredGame}
              viewedFrom={activeTeam.id}
              seasonId={activeSeason.id}
            />
          )}

          {otherGames.length > 0 && (
            <>
              <h2 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {isLeagueSeason ? `All games in ${activeSeason.name}` : `More games in ${activeSeason.name}`}
              </h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {otherGames.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    viewedFrom={activeTeam.id}
                    seasonId={activeSeason.id}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UI bits                                                             */
/* ------------------------------------------------------------------ */

function DashboardHeader({
  name,
  roleLabel,
  teams,
}: {
  name: string;
  roleLabel: string;
  teams: Array<{ slug: string; name: string; active: boolean; hasGames?: boolean }>;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, <span className="gradient-text">{name.split(' ')[0]}</span>
      </h1>
      <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        <span className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          {roleLabel}
        </span>
      </div>

      {teams.filter((t) => t.hasGames !== false).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {teams.filter((t) => t.hasGames !== false).map((t) => (
            <Link
              key={t.slug}
              href={`/dashboard?team=${t.slug}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                t.active
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SeasonChips({
  teamSlug,
  seasons,
}: {
  teamSlug: string;
  seasons: Array<{ slug: string; name: string; active: boolean }>;
}) {
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {seasons.map((s) => (
        <Link
          key={s.slug}
          href={`/dashboard?team=${teamSlug}&season=${s.slug}`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            s.active
              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
              : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)]">
      <div className="max-w-sm px-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-[var(--text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <p className="mt-4 text-base font-medium text-[var(--text-primary)]">{title}</p>
        {body && <p className="mt-2 text-sm text-[var(--text-muted)]">{body}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Game cards                                                          */
/* ------------------------------------------------------------------ */

type GameWithVideos = {
  id: string;
  title: string;
  playedAt: Date;
  slug: string;
  homeTeamId: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string } | null;
  videos: Array<{ id: string; title: string; thumbnailUrl: string | null }>;
  locked?: boolean;
};

function describeGame(game: GameWithVideos, viewedFromTeamId: string) {
  const isHome = game.homeTeam.id === viewedFromTeamId;
  const isAway = game.awayTeam?.id === viewedFromTeamId;

  if (!isHome && !isAway) {
    // Not the user's team — show full matchup
    const awayName = game.awayTeam?.name ?? 'TBD';
    return {
      matchup: `${game.homeTeam.name} vs ${awayName}`,
      homeAway: null as string | null,
      isHome: false,
    };
  }

  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const matchup = opponent ? `${isHome ? 'vs' : '@'} ${opponent.name}` : game.title;
  const homeAway = isHome ? 'Home' : 'Away';
  return { matchup, homeAway: homeAway as string | null, isHome };
}

function FeaturedGame({
  game,
  viewedFrom,
  seasonId,
}: {
  game: GameWithVideos;
  viewedFrom: string;
  seasonId: string;
}) {
  const { matchup, homeAway } = describeGame(game, viewedFrom);
  const video = game.videos[0];
  const locked = game.locked ?? false;

  const inner = (
    <div className="grid md:grid-cols-5">
      <div className="relative aspect-video bg-[var(--bg-primary)] md:col-span-3 md:aspect-auto">
        {cfThumbnail(video.thumbnailUrl) ? (
          <Image
            src={cfThumbnail(video.thumbnailUrl)!}
            alt={matchup}
            fill
            className={`object-cover transition-transform ${locked ? 'blur-sm scale-105' : ''}`}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        ) : null}
        {locked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="rounded-full bg-black/60 p-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
            <div className="rounded-full bg-white/95 p-4 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              <svg className="h-6 w-6 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 p-6 md:col-span-2">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-glow)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Latest
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] line-clamp-2">{matchup}</h3>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {new Date(game.playedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {homeAway ? ` · ${homeAway}` : ''}
          </p>
        </div>
        {locked ? (
          <UnlockButton label="Unlock to watch" />
        ) : (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-all group-hover:gap-3">
            Watch now
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );

  if (locked) {
    return (
      <div className="mb-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group mb-2 block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-[var(--border-hover)] hover:shadow-xl"
    >
      {inner}
    </Link>
  );
}

function GameCard({
  game,
  viewedFrom,
  seasonId,
}: {
  game: GameWithVideos;
  viewedFrom: string;
  seasonId: string;
}) {
  const { matchup, homeAway } = describeGame(game, viewedFrom);
  const video = game.videos[0];
  const locked = game.locked ?? false;

  const inner = (
    <>
      <div className="relative aspect-video bg-[var(--bg-primary)] overflow-hidden">
        {cfThumbnail(video?.thumbnailUrl) && (
          <Image
            src={cfThumbnail(video.thumbnailUrl)!}
            alt={matchup}
            fill
            className={`object-cover transition-transform ${locked ? 'blur-sm scale-105' : 'group-hover:scale-105'}`}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        )}
        {!video && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              No footage yet
            </span>
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="rounded-full bg-black/60 p-2.5">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className={`text-sm font-semibold line-clamp-1 ${locked ? 'text-[var(--text-muted)]' : ''}`}>
          {matchup}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {new Date(game.playedAt).toLocaleDateString()}
          {homeAway ? ` · ${homeAway}` : ''}
        </p>
        {locked && (
          <div className="mt-2">
            <UnlockButton />
          </div>
        )}
      </div>
    </>
  );

  if (!video) {
    return (
      <div className="video-card overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] opacity-60">
        {inner}
      </div>
    );
  }

  if (locked) {
    return (
      <div className="video-card overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/videos/${video.id}`}
      className="video-card group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
    >
      {inner}
    </Link>
  );
}
