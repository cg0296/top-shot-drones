export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

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
  const isPrivileged = isAdmin || user.role === 'STAFF';

  // Build video query based on role
  const videoWhere =
    user.role === 'ADMIN'
      ? {}
      : user.role === 'VIEWER'
        ? {
            OR: [
              { visibility: 'PUBLIC' as const },
              { videoAccess: { some: { userId: user.id } } },
            ],
          }
        : {
            OR: [
              { visibility: 'PUBLIC' as const },
              ...(user.organizationId
                ? [
                    { organizationId: user.organizationId },
                    { game: { homeTeamId: user.organizationId } },
                    { game: { awayTeamId: user.organizationId } },
                  ]
                : []),
            ],
          };

  const [videos, videoCount, orgStats] = await Promise.all([
    db.video.findMany({
      where: videoWhere,
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    db.video.count({ where: videoWhere }),
    isAdmin
      ? db.organization.findMany({
          include: { _count: { select: { users: true, videos: true } } },
        })
      : Promise.resolve(null),
  ]);

  const [featured, ...recent] = videos;

  // No content state
  if (videos.length === 0) {
    const noOrg = !user.organizationId && user.role !== 'ADMIN';
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, <span className="gradient-text">{user.name}</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)]">
          <div className="max-w-sm text-center px-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {noOrg ? (
              <>
                <p className="mt-4 text-base font-medium text-[var(--text-primary)]">Welcome to Top Shot Drones</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  You&apos;re not part of a team yet. Your administrator will assign you and share videos soon.
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-base font-medium text-[var(--text-primary)]">No videos yet</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Videos from your team will appear here.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, <span className="gradient-text">{user.name.split(' ')[0]}</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {user.organization && ` · ${user.organization.name}`}
        </p>
      </div>

      {/* Admin stats */}
      {isAdmin && orgStats && (
        <div className="mb-10 grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Videos</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{videoCount}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Organizations</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{orgStats.length}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Users</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {orgStats.reduce((sum, o) => sum + o._count.users, 0)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">This Week</div>
            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {videos.filter((v) => Date.now() - v.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000).length}
            </div>
          </div>
        </div>
      )}

      {/* Featured video */}
      {featured && (
        <div className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Latest upload
          </h2>
          <Link
            href={`/videos/${featured.id}`}
            className="group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-[var(--border-hover)] hover:shadow-xl"
          >
            <div className="grid md:grid-cols-5">
              {/* Thumbnail */}
              <div className="relative aspect-video md:col-span-3 md:aspect-auto bg-[var(--bg-primary)]">
                {featured.thumbnailUrl ? (
                  <Image
                    src={featured.thumbnailUrl}
                    alt={featured.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                  <div className="rounded-full bg-white/95 p-4 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    <svg className="h-6 w-6 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col justify-between gap-4 p-6 md:col-span-2">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-glow)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    New
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] line-clamp-2">
                    {featured.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                    {featured.organization.name} · {formatTimeAgo(featured.createdAt)}
                  </p>
                  {featured.description && (
                    <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-3">
                      {featured.description}
                    </p>
                  )}
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] group-hover:gap-3 transition-all">
                  Watch now
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Recent videos */}
      {recent.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              More videos
            </h2>
            <Link
              href="/videos"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              View all ({videoCount}) →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 stagger-children">
            {recent.slice(0, 8).map((video) => (
              <Link
                key={video.id}
                href={`/videos/${video.id}`}
                className="video-card group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
              >
                <div className="relative aspect-video bg-[var(--bg-primary)]">
                  {video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                  <div className="video-overlay absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="rounded-full bg-white/95 p-2.5">
                      <svg className="h-5 w-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {video.organization.name} · {formatTimeAgo(video.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Admin quick actions */}
      {isPrivileged && (
        <div className="border-t border-[var(--border)] pt-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Quick actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/videos"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
            >
              Manage Videos →
            </Link>
            <Link
              href="/admin/users"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
            >
              Invite Users →
            </Link>
            {isAdmin && (
              <Link
                href="/admin/organizations"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              >
                Manage Organizations →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
