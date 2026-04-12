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

  if (!user) redirect('/login');

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
          where: { organizationId: user.organizationId! },
          include: { organization: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'VIEWER':
        return db.video.findMany({
          where: {
            videoAccess: { some: { userId: user.id } },
          },
          include: { organization: true },
          orderBy: { createdAt: 'desc' },
        });

      default:
        return [];
    }
  })();

  if (videos.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold text-slate-900">Videos</h1>
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-300">
          <p className="text-sm text-slate-500">No videos available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Videos</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="group overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {/* Thumbnail */}
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-slate-100">
                <span className="text-xs text-slate-400">No thumbnail</span>
              </div>
            )}

            {/* Card body */}
            <div className="p-4">
              <h2 className="truncate text-sm font-semibold text-slate-900 group-hover:text-slate-700">
                {video.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {video.organization.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(video.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
