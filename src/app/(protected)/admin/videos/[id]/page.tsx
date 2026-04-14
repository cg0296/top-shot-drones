export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { VideoAccessManager } from '@/components/video-access-manager';
import DeleteVideoButton from '@/components/delete-video-button';
import { EditGameForm } from '@/components/edit-game-form';
import { EditVideoForm } from '@/components/edit-video-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: video
      ? `${video.title} — Video Details — Top Shot Drones`
      : 'Video Not Found — Top Shot Drones',
  };
}

const visibilityBadge: Record<string, string> = {
  PUBLIC: 'badge-green',
  ORG: 'badge-blue',
  PRIVATE: 'badge-slate',
};

export default async function AdminVideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') redirect('/dashboard');

  const [video, allOrgs] = await Promise.all([
    db.video.findUnique({
      where: { id },
      include: {
        organization: true,
        game: {
          include: { homeTeam: true, awayTeam: true },
        },
      },
    }),
    db.organization.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  if (!video) notFound();

  // Games available for this video's org (home or away team)
  const availableGames = await db.game.findMany({
    where: {
      OR: [
        { homeTeamId: video.organizationId },
        { awayTeamId: video.organizationId },
      ],
    },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
    orderBy: { playedAt: 'desc' },
  });

  if (user.role === 'STAFF' && !user.memberships.some((m) => m.organizationId === video.organizationId)) {
    redirect('/dashboard');
  }

  const grants = await db.videoAccess.findMany({
    where: { videoId: video.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const grantedUserIds = grants.map((g) => g.userId);

  // Include users from both home and away teams if this video is linked to a game
  const relevantOrgIds = [
    video.organizationId,
    video.game?.homeTeam.id,
    video.game?.awayTeam?.id,
  ].filter((id): id is string => Boolean(id));
  const uniqueOrgIds = [...new Set(relevantOrgIds)];

  const eligibleUsers = await db.user.findMany({
    where: {
      memberships: { some: { organizationId: { in: uniqueOrgIds } } },
      id: { notIn: grantedUserIds.length > 0 ? grantedUserIds : undefined },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  const serializedGrants = grants.map((g) => ({
    id: g.id,
    userId: g.user.id,
    userName: g.user.name,
    userEmail: g.user.email,
    accessType: g.accessType,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div className="animate-fade-in">
      <Link
        href="/admin/videos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Videos
      </Link>

      {/* Video metadata */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {video.title}
          </h1>
          <DeleteVideoButton
            videoId={video.id}
            videoTitle={video.title}
            redirectTo="/admin/videos"
            className="rounded-md border border-[rgba(229,25,62,0.3)] bg-[rgba(229,25,62,0.1)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[rgba(229,25,62,0.2)]"
          />
        </div>

        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Organization
            </dt>
            <dd className="mt-1 text-sm text-[var(--text-primary)]">
              {video.organization.name}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Visibility
            </dt>
            <dd className="mt-1">
              <span className={`badge ${visibilityBadge[video.visibility] ?? 'badge-slate'}`}>
                {video.visibility}
              </span>
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Cloudflare Video ID
            </dt>
            <dd className="mt-1 font-mono text-sm text-[var(--text-secondary)]">
              {video.cloudflareVideoId}
            </dd>
          </div>
        </dl>
      </div>

      {/* Video editing */}
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Edit Video
      </h2>
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <EditVideoForm
          videoId={video.id}
          initialTitle={video.title}
          initialDescription={video.description ?? null}
          initialVisibility={video.visibility}
          initialGameId={video.gameId ?? null}
          games={availableGames.map((g) => ({
            id: g.id,
            title: g.title,
            playedAt: g.playedAt.toISOString(),
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
          }))}
        />
      </div>

      {/* Game editing */}
      {video.game && (
        <>
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Edit Game
          </h2>
          <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <EditGameForm
              gameId={video.game.id}
              initialTitle={video.game.title}
              initialHomeTeamId={video.game.homeTeam.id}
              initialAwayTeamId={video.game.awayTeam?.id ?? null}
              initialNotes={video.game.notes ?? null}
              organizations={allOrgs}
            />
          </div>
        </>
      )}

      {/* Access management */}
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Access Management
      </h2>
      <VideoAccessManager
        videoId={video.id}
        grants={serializedGrants}
        eligibleUsers={eligibleUsers}
      />
    </div>
  );
}
