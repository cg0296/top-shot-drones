export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export const metadata = {
  title: 'Videos — Top Shot Drones',
};

export default async function VideosPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');

  const orgIds = user.memberships.map((m) => m.organizationId);

  const videos = await (async () => {
    switch (user.role) {
      case 'ADMIN':
        return db.video.findMany({
          include: { organization: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'STAFF':
      case 'CUSTOMER':
        return db.video.findMany({
          where: {
            OR: [
              { visibility: 'PUBLIC' },
              ...(orgIds.length
                ? [
                    { organizationId: { in: orgIds } },
                    { game: { homeTeamId: { in: orgIds } } },
                    { game: { awayTeamId: { in: orgIds } } },
                  ]
                : []),
            ],
          },
          include: { organization: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'VIEWER':
        return db.video.findMany({
          where: {
            OR: [
              { visibility: 'PUBLIC' },
              { videoAccess: { some: { userId: user.id } } },
            ],
          },
          include: { organization: true },
          orderBy: { createdAt: 'desc' },
        });

      default:
        return [];
    }
  })();

  if (videos.length === 0) {
    const noOrg = orgIds.length === 0 && user.role !== 'ADMIN';
    return (
      <div className="animate-fade-in">
        <h1 className="mb-8 text-2xl font-bold tracking-tight gradient-text">Videos</h1>
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)]">
          <div className="text-center max-w-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {noOrg ? (
              <>
                <p className="mt-4 text-base font-medium text-[var(--text-primary)]">Welcome to Top Shot Drones</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  You&apos;re not part of an organization yet. Your administrator will assign you to a team and grant you access to videos soon.
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-base font-medium text-[var(--text-primary)]">No videos available</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  There are no videos shared with you yet. Check back later or contact your administrator.
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight gradient-text">Videos</h1>
        <span className="text-sm text-[var(--text-muted)]">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 stagger-children">
        {videos.map((video) => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="video-card group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-secondary)]">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                </div>
              )}

              {/* Hover overlay with play button */}
              <div className="video-overlay absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                </div>
              </div>

              {/* Gradient bottom */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
            </div>

            {/* Card body */}
            <div className="p-3.5">
              <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {video.title}
              </h2>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  {video.organization.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(video.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
