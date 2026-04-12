export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { RegisterVideoForm } from '@/components/register-video-form';
import { SyncCloudflareButton } from '@/components/sync-cloudflare-button';

export const metadata = {
  title: 'Manage Videos — Top Shot Drones',
};

export default async function AdminVideosPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') redirect('/dashboard');

  const isAdmin = user.role === 'ADMIN';

  const videos = await db.video.findMany({
    where: isAdmin ? {} : { organizationId: user.organizationId! },
    include: { organization: true, uploadedBy: true },
    orderBy: { createdAt: 'desc' },
  });

  const organizations = isAdmin
    ? await db.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : user.organizationId
      ? await db.organization.findMany({
          where: { id: user.organizationId },
          select: { id: true, name: true },
        })
      : [];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight gradient-text">
          Manage Videos
        </h1>
        {isAdmin && <SyncCloudflareButton />}
      </div>

      {/* Register video form at top */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Register a Video
        </h2>
        <RegisterVideoForm
          organizations={organizations}
          currentUserId={user.id}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="table-dark w-full">
          <thead>
            <tr>
              <th>Title</th>
              <th>Organization</th>
              <th>Visibility</th>
              <th>CF Video ID</th>
              <th>Uploaded By</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-[var(--text-muted)]">
                  No videos registered yet
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id}>
                  <td>
                    <Link
                      href={`/admin/videos/${video.id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                    >
                      {video.title}
                    </Link>
                  </td>
                  <td>{video.organization.name}</td>
                  <td>
                    <VisibilityBadge visibility={video.visibility} />
                  </td>
                  <td className="font-mono text-xs">
                    {video.cloudflareVideoId.length > 12
                      ? `${video.cloudflareVideoId.slice(0, 12)}...`
                      : video.cloudflareVideoId}
                  </td>
                  <td>{video.uploadedBy.name}</td>
                  <td>
                    {new Date(video.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const styles: Record<string, string> = {
    PUBLIC: 'badge-green',
    ORG: 'badge-blue',
    PRIVATE: 'badge-slate',
  };

  return (
    <span className={`badge ${styles[visibility] ?? 'badge-slate'}`}>
      {visibility}
    </span>
  );
}
