export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { getSignedPlaybackToken } from '@/lib/cloudflare';
import { VideoReactions } from '@/components/video-reactions';
import { VideoComments } from '@/components/video-comments';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const video = await db.video.findUnique({
    where: { id },
    select: { title: true },
  });

  if (!video) {
    return { title: 'Video Not Found' };
  }

  return { title: `${video.title} — Top Shot Drones` };
}

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const video = await db.video.findUnique({
    where: { id },
    include: {
      organization: true,
      uploadedBy: true,
    },
  });

  if (!video) notFound();

  // Authorization
  let authorized = false;

  switch (user.role) {
    case 'ADMIN':
      authorized = true;
      break;
    case 'STAFF':
    case 'CUSTOMER':
      authorized = video.organizationId === user.organizationId;
      break;
    case 'VIEWER': {
      const access = await db.videoAccess.findUnique({
        where: {
          videoId_userId: {
            videoId: video.id,
            userId: user.id,
          },
        },
      });
      authorized = !!access;
      break;
    }
  }

  if (!authorized) redirect('/dashboard');

  const subdomain = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;

  let iframeSrc: string | null = null;
  let privateVideoError = false;

  if (video.visibility === 'PRIVATE') {
    const token = await getSignedPlaybackToken(video.cloudflareVideoId);
    if (token) {
      iframeSrc = `https://customer-${subdomain}.cloudflarestream.com/${token}/iframe`;
    } else {
      privateVideoError = true;
    }
  } else {
    iframeSrc = `https://customer-${subdomain}.cloudflarestream.com/${video.cloudflareVideoId}/iframe`;
  }

  const uploadDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(video.createdAt);

  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      {/* Back link */}
      <Link
        href="/videos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Videos
      </Link>

      {/* Video player */}
      <div className="overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/50">
        {privateVideoError ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="mt-3 text-sm text-[var(--text-muted)]">Unable to load private video</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={iframeSrc!}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Video metadata */}
      <div className="mt-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {video.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            {video.organization.name}
          </span>
          <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
          <span>{uploadDate}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
          <span>by {video.uploadedBy.name}</span>
        </div>

        {video.description && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
              {video.description}
            </p>
          </div>
        )}

        {/* Reactions */}
        <VideoReactions videoId={video.id} />
      </div>

      {/* Comments */}
      <div className="mt-10 border-t border-[var(--border)] pt-8">
        <VideoComments
          videoId={video.id}
          currentUserId={user.id}
          isAdmin={user.role === 'ADMIN'}
        />
      </div>
    </div>
  );
}
