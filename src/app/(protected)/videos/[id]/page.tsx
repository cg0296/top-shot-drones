export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { getSignedPlaybackToken } from '@/lib/cloudflare';
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
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <Link
        href="/videos"
        className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <svg
          className="mr-1.5 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Videos
      </Link>

      {/* Video player */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-black">
        {privateVideoError ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-red-400">Unable to load private video</p>
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
        <h1 className="text-2xl font-bold text-slate-900">{video.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span>{video.organization.name}</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>{uploadDate}</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Uploaded by {video.uploadedBy.name}</span>
        </div>

        {video.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}
