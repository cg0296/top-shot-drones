export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { VideoAccessManager } from '@/components/video-access-manager';

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

const visibilityStyles: Record<string, string> = {
  PUBLIC: 'bg-green-100 text-green-700',
  ORG: 'bg-blue-100 text-blue-700',
  PRIVATE: 'bg-slate-100 text-slate-600',
};

export default async function AdminVideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') redirect('/dashboard');

  const video = await db.video.findUnique({
    where: { id },
    include: { organization: true },
  });

  if (!video) notFound();

  // STAFF can only view videos in their own organization
  if (user.role === 'STAFF' && video.organizationId !== user.organizationId) {
    redirect('/dashboard');
  }

  const grants = await db.videoAccess.findMany({
    where: { videoId: video.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const grantedUserIds = grants.map((g) => g.userId);

  const eligibleUsers = await db.user.findMany({
    where: {
      organizationId: video.organizationId,
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
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/videos"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        &larr; Back to Videos
      </Link>

      {/* Video metadata */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">
          {video.title}
        </h1>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Organization
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {video.organization.name}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Visibility
            </dt>
            <dd className="mt-1">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${visibilityStyles[video.visibility] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {video.visibility}
              </span>
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Cloudflare Video ID
            </dt>
            <dd className="mt-1 font-mono text-sm text-slate-600">
              {video.cloudflareVideoId}
            </dd>
          </div>
        </dl>
      </div>

      {/* Access management */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
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
