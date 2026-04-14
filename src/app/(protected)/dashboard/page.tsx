export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export const metadata = {
  title: 'Dashboard — Top Shot Drones',
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const isAdmin = user.role === 'ADMIN';

  if (isAdmin) {
    return <AdminDashboard userName={user.name} />;
  }

  return <MemberDashboard userId={user.id} userName={user.name} />;
}

/* ------------------------------------------------------------------ */
/* Team member dashboard                                               */
/* ------------------------------------------------------------------ */

async function MemberDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const memberships = await db.organizationMembership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
  });

  if (memberships.length === 0) {
    return (
      <div className="animate-fade-in">
        <DashboardHeader name={userName} subtitle="Not on a team yet" />
        <EmptyState
          title="Welcome to Top Shot Drones"
          body="You’re not on a team yet. Your coach or admin will add you and your games will show up here automatically."
        />
      </div>
    );
  }

  const orgIds = memberships.map((m) => m.organizationId);

  // Pull the most-recent video (across all the user's teams) for the hero.
  const latest = await db.video.findFirst({
    where: {
      OR: [
        { organizationId: { in: orgIds } },
        { game: { homeTeamId: { in: orgIds } } },
        { game: { awayTeamId: { in: orgIds } } },
      ],
    },
    include: {
      organization: true,
      game: { include: { homeTeam: true, awayTeam: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Per-team recent videos (top 4 each)
  const teamSections = await Promise.all(
    memberships.map(async (m) => {
      const videos = await db.video.findMany({
        where: {
          OR: [
            { organizationId: m.organizationId },
            { game: { homeTeamId: m.organizationId } },
            { game: { awayTeamId: m.organizationId } },
          ],
        },
        include: {
          game: { include: { homeTeam: true, awayTeam: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      });
      return { org: m.organization, role: m.role, videos };
    }),
  );

  const hasAnyVideo = teamSections.some((s) => s.videos.length > 0);

  return (
    <div className="animate-fade-in">
      <DashboardHeader
        name={userName}
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            {memberships.map((m) => (
              <Link
                key={m.organizationId}
                href={`/orgs/${m.organization.slug}`}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {m.organization.name}
              </Link>
            ))}
          </span>
        }
      />

      {!hasAnyVideo ? (
        <EmptyState
          title="No footage yet"
          body="Clips will appear here after your next game. Check back soon."
        />
      ) : (
        <>
          {latest && <FeaturedVideo video={latest} />}

          <div className="space-y-10">
            {teamSections.map((section) => (
              <TeamSection key={section.org.id} {...section} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin dashboard — platform-wide view                                */
/* ------------------------------------------------------------------ */

async function AdminDashboard({ userName }: { userName: string }) {
  const [videos, videoCount, orgStats] = await Promise.all([
    db.video.findMany({
      include: {
        organization: true,
        game: { include: { homeTeam: true, awayTeam: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    db.video.count(),
    db.organization.findMany({
      include: { _count: { select: { memberships: true, videos: true } } },
    }),
  ]);

  const [featured, ...recent] = videos;

  return (
    <div className="animate-fade-in">
      <DashboardHeader
        name={userName}
        subtitle={<span className="text-xs uppercase tracking-wider">Admin</span>}
      />

      <div className="mb-10 grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Videos" value={videoCount} />
        <StatCard label="Organizations" value={orgStats.length} />
        <StatCard
          label="Memberships"
          value={orgStats.reduce((sum, o) => sum + o._count.memberships, 0)}
        />
        <StatCard
          label="This week"
          value={
            videos.filter(
              (v) => Date.now() - v.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000,
            ).length
          }
        />
      </div>

      {featured && (
        <div className="mb-10">
          <SectionHeading>Latest upload</SectionHeading>
          <FeaturedVideo video={featured} />
        </div>
      )}

      {recent.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <SectionHeading>More videos</SectionHeading>
            <Link
              href="/videos"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              View all ({videoCount}) →
            </Link>
          </div>
          <VideoGrid videos={recent.slice(0, 8)} />
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-8">
        <SectionHeading>Quick actions</SectionHeading>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <QuickAction href="/admin/upload">Upload video</QuickAction>
          <QuickAction href="/admin/videos">Manage videos</QuickAction>
          <QuickAction href="/admin/users">Invite users</QuickAction>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared UI bits                                                      */
/* ------------------------------------------------------------------ */

function DashboardHeader({
  name,
  subtitle,
}: {
  name: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, <span className="gradient-text">{name.split(' ')[0]}</span>
      </h1>
      <div className="mt-2 text-sm text-[var(--text-muted)]">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      <div className="mt-3">{subtitle}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </h2>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function QuickAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
    >
      {children} →
    </Link>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)]">
      <div className="max-w-sm px-6 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
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
        <p className="mt-2 text-sm text-[var(--text-muted)]">{body}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Video UI                                                            */
/* ------------------------------------------------------------------ */

type VideoForHero = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  organization: { name: string };
  game: {
    playedAt: Date;
    homeTeam: { name: string };
    awayTeam: { name: string } | null;
  } | null;
};

function FeaturedVideo({ video }: { video: VideoForHero }) {
  const matchup = video.game
    ? `${video.game.homeTeam.name} vs ${video.game.awayTeam?.name ?? 'TBD'}`
    : video.organization.name;

  const when = video.game ? video.game.playedAt : video.createdAt;

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group mb-10 block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-[var(--border-hover)] hover:shadow-xl"
    >
      <div className="grid md:grid-cols-5">
        <div className="relative aspect-video bg-[var(--bg-primary)] md:col-span-3 md:aspect-auto">
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
            <div className="rounded-full bg-white/95 p-4 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              <svg
                className="h-6 w-6 text-[var(--accent)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-6 md:col-span-2">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-glow)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
              Latest
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] line-clamp-2">
              {matchup}
            </h3>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              {video.title} · {formatTimeAgo(when)}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-all group-hover:gap-3">
            Watch now
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoGrid({
  videos,
}: {
  videos: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    createdAt: Date;
    organization: { name: string };
  }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <Link
          key={video.id}
          href={`/videos/${video.id}`}
          className="video-card group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        >
          <div className="relative aspect-video bg-[var(--bg-primary)]">
            {video.thumbnailUrl && (
              <Image
                src={video.thumbnailUrl}
                alt={video.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            )}
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold line-clamp-2">{video.title}</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {video.organization.name} · {formatTimeAgo(video.createdAt)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team section (member dashboard)                                     */
/* ------------------------------------------------------------------ */

function TeamSection({
  org,
  role,
  videos,
}: {
  org: { id: string; name: string; slug: string };
  role: string;
  videos: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    kind: string | null;
    createdAt: Date;
    game: {
      playedAt: Date;
      slug: string;
      homeTeam: { name: string; id: string };
      awayTeam: { name: string; id: string } | null;
    } | null;
  }>;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{org.name}</h2>
          <p className="text-xs text-[var(--text-muted)]">{role}</p>
        </div>
        <Link
          href={`/orgs/${org.slug}`}
          className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          View all seasons →
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">
          No videos for this team yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {videos.map((v) => {
            const opponent = v.game
              ? (v.game.homeTeam.id === org.id ? v.game.awayTeam : v.game.homeTeam)
              : null;
            const matchup = v.game
              ? (v.game.homeTeam.id === org.id
                  ? `vs ${opponent?.name ?? 'TBD'}`
                  : `@ ${opponent?.name ?? 'TBD'}`)
              : v.title;

            return (
              <Link
                key={v.id}
                href={`/videos/${v.id}`}
                className="video-card group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
              >
                <div className="relative aspect-video bg-[var(--bg-primary)]">
                  {v.thumbnailUrl && (
                    <Image
                      src={v.thumbnailUrl}
                      alt={v.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold line-clamp-1">{matchup}</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {v.game ? new Date(v.game.playedAt).toLocaleDateString() : formatTimeAgo(v.createdAt)}
                    {v.kind ? ` · ${v.kind}` : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
